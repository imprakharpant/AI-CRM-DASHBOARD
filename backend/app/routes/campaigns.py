import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from ..database import get_db
from ..models import Campaign, Customer, Order, Communication, Event
from ..schemas import CampaignCreate, CampaignResponse
from ..services.campaign_service import launch_campaign_task

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

class CampaignLaunchRequest(BaseModel):
    inactive_days: Optional[int] = None
    min_spend: Optional[float] = None

@router.post("", response_model=CampaignResponse)
def create_campaign(campaign: CampaignCreate, db: Session = Depends(get_db)):
    db_campaign = Campaign(
        name=campaign.name,
        goal=campaign.goal,
        channel=campaign.channel.lower(),
        message=campaign.message,
        status="draft",
        audience_size=0
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()

@router.get("/{campaign_id}")
def get_campaign_detail(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Aggregate communication stats
    comms = db.query(Communication).filter(Communication.campaign_id == campaign_id).all()
    total_comms = len(comms)
    
    # Status counts
    sent_count = sum(1 for c in comms if c.status in ["sent", "delivered", "opened", "read", "clicked", "converted"])
    delivered_count = sum(1 for c in comms if c.status in ["delivered", "opened", "read", "clicked", "converted"])
    opened_count = sum(1 for c in comms if c.status in ["opened", "read", "clicked", "converted"])
    read_count = sum(1 for c in comms if c.status in ["read", "clicked", "converted"])
    clicked_count = sum(1 for c in comms if c.status in ["clicked", "converted"])
    failed_count = sum(1 for c in comms if c.status == "failed")
    pending_count = sum(1 for c in comms if c.status == "pending")

    # Fetch conversion events specifically for this campaign's communications
    # Event.communication_id belongs to Communication.campaign_id == campaign_id
    conversion_events = (
        db.query(Event)
        .join(Communication)
        .filter(Communication.campaign_id == campaign_id)
        .filter(Event.event_type == "conversion")
        .all()
    )
    
    conversions_count = len(conversion_events)
    conversion_revenue = 0.0
    for e in conversion_events:
        if e.metadata_json and isinstance(e.metadata_json, dict):
            conversion_revenue += float(e.metadata_json.get("amount", 0.0))

    return {
        "id": campaign.id,
        "name": campaign.name,
        "goal": campaign.goal,
        "audience_size": campaign.audience_size,
        "channel": campaign.channel,
        "message": campaign.message,
        "status": campaign.status,
        "ai_summary": campaign.ai_summary,
        "created_at": campaign.created_at,
        "metrics": {
            "sent": sent_count,
            "delivered": delivered_count,
            "opened": opened_count,
            "read": read_count,
            "clicked": clicked_count,
            "failed": failed_count,
            "pending": pending_count,
            "conversions": conversions_count,
            "revenue": round(conversion_revenue, 2)
        }
    }

@router.post("/{campaign_id}/launch")
def launch_campaign(
    campaign_id: int, 
    payload: CampaignLaunchRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Only campaigns in 'draft' status can be launched")

    # Perform segmentation filter based on payload
    customer_query = db.query(Customer)

    # 1. Inactive Days filter: customers whose last purchase was at least X days ago
    if payload.inactive_days is not None:
        cutoff_date = datetime.date.today() - datetime.timedelta(days=payload.inactive_days)
        # Handle customers who have never purchased (if any) or whose purchase is before cutoff_date
        customer_query = customer_query.filter(
            or_(
                Customer.last_purchase_date == None,
                Customer.last_purchase_date <= cutoff_date
            )
        )

    # 2. Min Spend filter
    if payload.min_spend is not None:
        customer_query = customer_query.filter(Customer.total_spend >= payload.min_spend)

    customers = customer_query.all()
    customer_ids = [c.id for c in customers]

    if not customer_ids:
        raise HTTPException(status_code=400, detail="The chosen segment contains 0 customers. Cannot launch campaign.")

    # Update audience size in DB
    campaign.audience_size = len(customer_ids)
    campaign.status = "running"
    db.commit()

    # Launch task in background
    background_tasks.add_task(launch_campaign_task, campaign.id, customer_ids)

    return {
        "message": "Campaign launch initiated successfully",
        "campaign_id": campaign.id,
        "audience_size": len(customer_ids)
    }

# We also import or_ since we use it in the launch query
from sqlalchemy import or_

@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"message": f"Campaign {campaign_id} deleted successfully"}

