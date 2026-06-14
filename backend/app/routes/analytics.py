import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any
from ..database import get_db
from ..models import Customer, Order, Campaign, Communication, Event
from ..schemas import ReceiptCallback
from ..services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["analytics"])

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    total_customers = db.query(Customer).count()
    total_orders = db.query(Order).count()
    active_campaigns = db.query(Campaign).filter(Campaign.status == "running").count()
    
    # Store revenue (overall sum of orders)
    store_revenue = db.query(func.sum(Order.amount)).scalar() or 0.0
    
    # Campaign attributed revenue (sum of amounts in conversion events metadata)
    conversion_events = db.query(Event).filter(Event.event_type == "conversion").all()
    campaign_revenue = 0.0
    for e in conversion_events:
        if e.metadata_json and isinstance(e.metadata_json, dict):
            campaign_revenue += float(e.metadata_json.get("amount", 0.0))

    # Average Open Rate: total opened communications / total delivered communications
    total_delivered = db.query(Communication).filter(Communication.status.in_(["delivered", "opened", "read", "clicked", "converted"])).count()
    total_opened = db.query(Communication).filter(Communication.status.in_(["opened", "read", "clicked", "converted"])).count()
    
    avg_open_rate = (total_opened / total_delivered * 100) if total_delivered > 0 else 0.0

    return {
        "total_customers": total_customers,
        "total_orders": total_orders,
        "active_campaigns": active_campaigns,
        "store_revenue": round(store_revenue, 2),
        "campaign_revenue": round(campaign_revenue, 2),
        "avg_open_rate": round(avg_open_rate, 1)
    }

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Retrieve all completed or running campaigns to compute performance rates for charts
    campaigns = db.query(Campaign).filter(Campaign.status.in_(["running", "completed"])).order_by(Campaign.created_at.asc()).all()
    
    chart_data = []
    for c in campaigns:
        comms = db.query(Communication).filter(Communication.campaign_id == c.id).all()
        sent = len(comms)
        if sent == 0:
            continue
            
        delivered = sum(1 for co in comms if co.status in ["delivered", "opened", "read", "clicked", "converted"])
        opened = sum(1 for co in comms if co.status in ["opened", "read", "clicked", "converted"])
        read = sum(1 for co in comms if co.status in ["read", "clicked", "converted"])
        clicked = sum(1 for co in comms if co.status in ["clicked", "converted"])
        
        conversion_events = (
            db.query(Event)
            .join(Communication)
            .filter(Communication.campaign_id == c.id)
            .filter(Event.event_type == "conversion")
            .count()
        )
        
        chart_data.append({
            "id": c.id,
            "name": c.name,
            "channel": c.channel,
            "sent": sent,
            "delivery_rate": round(delivered / sent * 100, 1),
            "open_rate": round(opened / delivered * 100, 1) if delivered > 0 else 0.0,
            "read_rate": round(read / opened * 100, 1) if opened > 0 else 0.0,
            "click_rate": round(clicked / read * 100, 1) if read > 0 else 0.0,
            "conversion_rate": round(conversion_events / clicked * 100, 1) if clicked > 0 else 0.0,
            "conversions": conversion_events
        })
        
    return chart_data

@router.get("/events")
def get_events(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    query = (
        db.query(Event)
        .join(Communication, Event.communication_id == Communication.id)
        .join(Campaign, Communication.campaign_id == Campaign.id)
        .join(Customer, Communication.customer_id == Customer.id)
    )
    
    total = query.count()
    offset = (page - 1) * limit
    
    events = (
        query.order_by(desc(Event.timestamp))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": e.id,
                "communication_id": e.communication_id,
                "event_type": e.event_type,
                "timestamp": e.timestamp.isoformat(),
                "metadata": e.metadata_json,
                "campaign_name": e.communication.campaign.name,
                "customer_name": e.communication.customer.name,
                "channel": e.communication.channel
            } for e in events
        ]
    }

@router.post("/receipts")
def receive_receipt(callback: ReceiptCallback, db: Session = Depends(get_db)):
    comm = db.query(Communication).filter(Communication.id == callback.communication_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")
        
    event_type = callback.event_type.lower()
    timestamp = callback.timestamp or datetime.datetime.utcnow()
    
    # Write event log
    event = Event(
        communication_id=comm.id,
        event_type=event_type,
        metadata_json=callback.metadata_json,
        timestamp=timestamp
    )
    db.add(event)
    
    # Update communication status
    # Standard lifecycle states: sent -> delivered -> opened -> read -> clicked -> converted
    if event_type == "conversion":
        comm.status = "converted"
        
        # Attribute conversion to a new customer purchase!
        # Create an Order record if metadata contains details
        if callback.metadata_json and "amount" in callback.metadata_json:
            amount = float(callback.metadata_json["amount"])
            
            # Create simulated order
            order = Order(
                customer_id=comm.customer_id,
                amount=amount,
                order_date=datetime.date.today()
            )
            db.add(order)
            db.flush() # Populate order ID
            
            # Update customer statistics
            customer = comm.customer
            customer.total_spend = (customer.total_spend or 0.0) + amount
            customer.last_purchase_date = datetime.date.today()
            
            # Update event metadata with order_id
            event.metadata_json = {
                **callback.metadata_json,
                "order_id": order.id
            }
    else:
        # Avoid reverting status (e.g. if we receive opened after clicked, keep clicked)
        status_rank = {"pending": 0, "sent": 1, "delivered": 2, "opened": 3, "read": 4, "clicked": 5, "converted": 6, "failed": -1}
        current_rank = status_rank.get(comm.status, 0)
        new_rank = status_rank.get(event_type, 0)
        
        # Update if it's a progress or a failure
        if new_rank == -1 or new_rank > current_rank:
            comm.status = event_type
            
    db.commit()
    return {"status": "success", "event_id": event.id}
