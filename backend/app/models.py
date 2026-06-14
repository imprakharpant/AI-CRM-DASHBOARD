import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    total_spend = Column(Float, default=0.0)
    last_purchase_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    communications = relationship("Communication", back_populates="customer", cascade="all, delete-orphan")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    order_date = Column(Date, nullable=False)

    customer = relationship("Customer", back_populates="orders")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    goal = Column(Text, nullable=True)
    audience_size = Column(Integer, default=0)
    channel = Column(String, nullable=False)  # 'whatsapp', 'sms', 'email', 'rcs'
    message = Column(Text, nullable=False)
    status = Column(String, default="draft")  # 'draft', 'running', 'completed', 'failed'
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    communications = relationship("Communication", back_populates="campaign", cascade="all, delete-orphan")

class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    channel = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="pending")  # 'pending', 'sent', 'delivered', 'read', 'failed'
    sent_at = Column(DateTime, nullable=True)
    delivery_attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    campaign = relationship("Campaign", back_populates="communications")
    customer = relationship("Customer", back_populates="communications")
    events = relationship("Event", back_populates="communication", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    communication_id = Column(Integer, ForeignKey("communications.id"), nullable=False)
    event_type = Column(String, nullable=False)  # 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked', 'conversion'
    metadata_json = Column(JSON, nullable=True)  # Store conversion order_id, amount etc.
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    communication = relationship("Communication", back_populates="events")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
