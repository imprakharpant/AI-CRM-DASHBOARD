import os
import random
import asyncio
import logging
import requests
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ChannelService")

app = FastAPI(
    title="Xeno AI CRM Channel Service",
    description="Stubbed communication channel service that simulates message delivery and engagement tracking via callbacks",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SendRequest(BaseModel):
    communication_id: int
    customer_id: int
    message: str
    channel: str # 'whatsapp', 'sms', 'email', 'rcs'
    callback_url: str

async def fire_callback(url: str, comm_id: int, event_type: str, metadata: Optional[Dict[str, Any]] = None):
    payload = {
        "communication_id": comm_id,
        "event_type": event_type,
        "metadata_json": metadata,
        "timestamp": datetime.utcnow().isoformat()
    }
    try:
        logger.info(f"Firing callback for comm {comm_id} - event: {event_type} to {url}")
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(url, json=payload, timeout=5)
        )
        if response.status_code != 200:
            logger.error(f"Callback returned status {response.status_code} for comm {comm_id}")
    except Exception as e:
        logger.error(f"Failed to fire callback for comm {comm_id}: {e}")

async def simulate_communication_lifecycle(req: SendRequest):
    """
    Simulates the lifecycle of a message asynchronously:
    1. Sent (instant)
    2. Delivered (90% success) or Failed (10%)
    3. Opened (70% probability if delivered)
    4. Read (60% probability if opened)
    5. Clicked (30% probability if read)
    6. Conversion (15% probability if clicked) - order is attributed
    """
    comm_id = req.communication_id
    callback_url = req.callback_url
    
    # 1. Dispatch simulation delay
    await asyncio.sleep(random.uniform(0.5, 2.0))
    
    # 2. Delivered vs Failed
    if random.random() < 0.10:
        # 10% failure rate
        await fire_callback(callback_url, comm_id, "failed", {"reason": "Delivery failed: Recipient terminal offline"})
        return
        
    await fire_callback(callback_url, comm_id, "delivered")
    
    # 3. Opened check
    await asyncio.sleep(random.uniform(1.0, 3.0))
    if random.random() > 0.70:
        return # Not opened
        
    await fire_callback(callback_url, comm_id, "opened")
    
    # 4. Read check
    await asyncio.sleep(random.uniform(0.5, 1.5))
    if random.random() > 0.60:
        return # Opened but not fully read
        
    await fire_callback(callback_url, comm_id, "read")
    
    # 5. Clicked check
    await asyncio.sleep(random.uniform(1.0, 3.0))
    if random.random() > 0.30:
        return # Read but call to action ignored
        
    await fire_callback(callback_url, comm_id, "clicked")
    
    # 6. Conversion check (Order made!)
    await asyncio.sleep(random.uniform(1.0, 4.0))
    if random.random() > 0.15:
        return # Clicked but did not buy
        
    # Generate random attributed order amount
    order_amount = round(random.uniform(500.0, 8000.0), 2)
    await fire_callback(
        callback_url, 
        comm_id, 
        "conversion", 
        {"amount": order_amount, "currency": "INR", "reason": "Campaign call-to-action purchase"}
    )

@app.post("/send")
def send_message(req: SendRequest, background_tasks: BackgroundTasks):
    logger.info(f"Received send request for communication {req.communication_id} via {req.channel}")
    # Run the simulation in background tasks so the API returns immediately
    background_tasks.add_task(simulate_communication_lifecycle, req)
    return {"status": "queued", "communication_id": req.communication_id}

@app.get("/")
def health_check():
    return {"name": "Xeno AI CRM Channel Service", "status": "healthy"}
