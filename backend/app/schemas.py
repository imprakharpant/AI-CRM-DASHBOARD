from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime

# Customer Schemas
class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    total_spend: float = 0.0
    last_purchase_date: Optional[date] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Order Schemas
class OrderBase(BaseModel):
    customer_id: int
    amount: float
    order_date: date

class OrderCreate(OrderBase):
    pass

class OrderResponse(OrderBase):
    id: int

    class Config:
        from_attributes = True

# Campaign Schemas
class CampaignBase(BaseModel):
    name: str
    goal: Optional[str] = None
    channel: str  # 'whatsapp', 'sms', 'email', 'rcs'
    message: str

class CampaignCreate(CampaignBase):
    pass

class CampaignResponse(CampaignBase):
    id: int
    audience_size: int
    status: str
    ai_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Communication Schemas
class CommunicationResponse(BaseModel):
    id: int
    campaign_id: int
    customer_id: int
    channel: str
    message: str
    status: str
    sent_at: Optional[datetime] = None
    delivery_attempts: int
    created_at: datetime

    class Config:
        from_attributes = True

# Event / Receipt Callback Schemas
class ReceiptCallback(BaseModel):
    communication_id: int
    event_type: str  # 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked', 'conversion'
    metadata_json: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None

# AI Payload Schemas
class AISegmentRequest(BaseModel):
    prompt: str

class AISegmentResponse(BaseModel):
    inactive_days: Optional[int] = None
    min_spend: Optional[float] = None
    description: str
    matching_count: int

class AIMessageRequest(BaseModel):
    segment_description: str
    angle: str
    urgency: str
    tone: str
    channels: List[str]

class AIMessageResponse(BaseModel):
    message: str
    channels: List[str]
    subject: Optional[str] = None  # Relevant for emails

class AIInsightsRequest(BaseModel):
    campaign_id: int

class AIInsightsResponse(BaseModel):
    summary: str
    recommendations: List[str]

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
