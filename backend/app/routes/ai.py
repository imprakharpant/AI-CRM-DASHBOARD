import os
import requests
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database import get_db
from ..models import Customer, Campaign, Communication, Event
from ..schemas import (
    AISegmentRequest, AISegmentResponse,
    AIMessageRequest, AIMessageResponse,
    AIInsightsRequest, AIInsightsResponse
)
from ..services.ai_service import (
    parse_segment_prompt,
    generate_campaign_message as ai_generate_message,
    generate_campaign_insights as ai_generate_insights
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/segment", response_model=AISegmentResponse)
def segment_customers(payload: AISegmentRequest, db: Session = Depends(get_db)):
    filters = parse_segment_prompt(payload.prompt)
    
    inactive_days = filters.get("inactive_days")
    min_spend = filters.get("min_spend")

    # Build DB query to see count of matching customers
    query = db.query(Customer)

    if inactive_days is not None:
        cutoff_date = datetime.date.today() - datetime.timedelta(days=inactive_days)
        query = query.filter(
            or_(
                Customer.last_purchase_date == None,
                Customer.last_purchase_date <= cutoff_date
            )
        )

    if min_spend is not None:
        query = query.filter(Customer.total_spend >= min_spend)

    matching_count = query.count()

    # Generate human description
    desc_parts = []
    if inactive_days is not None:
        desc_parts.append(f"inactive for {inactive_days}+ days")
    if min_spend is not None and min_spend > 0:
        desc_parts.append(f"spent at least ₹{min_spend:,.0f}")
    
    description = "All customers"
    if desc_parts:
        description = "Customers " + " and ".join(desc_parts)

    return {
        "inactive_days": inactive_days,
        "min_spend": min_spend,
        "description": description,
        "matching_count": matching_count
    }

@router.post("/message", response_model=AIMessageResponse)
def generate_message(payload: AIMessageRequest):
    result = ai_generate_message(
        segment_description=payload.segment_description,
        angle=payload.angle,
        urgency=payload.urgency,
        tone=payload.tone,
        channels=payload.channels
    )
    return result

@router.post("/insights", response_model=AIInsightsResponse)
def generate_insights(payload: AIInsightsRequest, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == payload.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Aggregate stats
    comms = db.query(Communication).filter(Communication.campaign_id == payload.campaign_id).all()
    sent_count = sum(1 for c in comms if c.status in ["sent", "delivered", "opened", "read", "clicked", "converted"])
    delivered_count = sum(1 for c in comms if c.status in ["delivered", "opened", "read", "clicked", "converted"])
    opened_count = sum(1 for c in comms if c.status in ["opened", "read", "clicked", "converted"])
    read_count = sum(1 for c in comms if c.status in ["read", "clicked", "converted"])
    clicked_count = sum(1 for c in comms if c.status in ["clicked", "converted"])
    failed_count = sum(1 for c in comms if c.status == "failed")

    # Fetch conversions
    conversion_events = (
        db.query(Event)
        .join(Communication)
        .filter(Communication.campaign_id == payload.campaign_id)
        .filter(Event.event_type == "conversion")
        .all()
    )
    conversions_count = len(conversion_events)

    metrics = {
        "sent": sent_count,
        "delivered": delivered_count,
        "opened": opened_count,
        "read": read_count,
        "clicked": clicked_count,
        "failed": failed_count,
        "conversions": conversions_count
    }

    insights = ai_generate_insights(metrics)
    
    # Save the generated summary back to campaign for reference
    campaign.ai_summary = f"Summary: {insights['summary']}\n\nRecommendations:\n" + "\n".join([f"- {r}" for r in insights['recommendations']])
    db.commit()

    return insights

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY not configured. Please add it to the .env file.")
        
    # Using nova-2 model for fast and accurate general transcription
    url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": file.content_type or "audio/webm"
    }
    
    try:
        contents = await file.read()
        response = requests.post(url, headers=headers, data=contents, timeout=10)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Deepgram: {str(e)}")
    
    if response.status_code == 200:
        data = response.json()
        try:
            transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
            return {"transcript": transcript}
        except (KeyError, IndexError):
            return {"transcript": ""}
    else:
        raise HTTPException(status_code=response.status_code, detail=f"Deepgram API error: {response.text}")
