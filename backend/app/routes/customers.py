import io
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Dict, Any
from ..database import get_db
from ..models import Customer, Order
from ..schemas import CustomerResponse

router = APIRouter(prefix="/api/customers", tags=["customers"])

@router.get("", response_model=Dict[str, Any])
def list_customers(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    query = db.query(Customer)
    
    if search:
        query = query.filter(
            or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%")
            )
        )
        
    total = query.count()
    offset = (page - 1) * limit
    customers = query.order_by(Customer.id.asc()).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "total_spend": c.total_spend,
                "last_purchase_date": c.last_purchase_date.isoformat() if c.last_purchase_date else None,
                "created_at": c.created_at
            } for c in customers
        ]
    }

@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    orders = db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.order_date.desc()).all()
    
    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "total_spend": customer.total_spend,
        "last_purchase_date": customer.last_purchase_date.isoformat() if customer.last_purchase_date else None,
        "created_at": customer.created_at,
        "orders": [
            {
                "id": o.id,
                "amount": o.amount,
                "order_date": o.order_date.isoformat()
            } for o in orders
        ]
    }

@router.post("/upload")
async def upload_customers_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validate required columns
        required_cols = {"name", "email"}
        if not required_cols.issubset(df.columns):
            raise HTTPException(status_code=400, detail=f"CSV must contain at least 'name' and 'email' columns. Found: {list(df.columns)}")
            
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            name = str(row["name"]).strip()
            email = str(row["email"]).strip()
            phone = str(row.get("phone", "")).strip() if pd.notna(row.get("phone")) else None
            
            # Check for existing email to avoid duplicates
            existing = db.query(Customer).filter(Customer.email == email).first()
            if existing:
                error_count += 1
                continue
                
            customer = Customer(
                name=name,
                email=email,
                phone=phone if phone else None,
                total_spend=0.0,
                last_purchase_date=None
            )
            db.add(customer)
            success_count += 1
            
        db.commit()
        return {
            "message": "CSV upload completed",
            "imported": success_count,
            "skipped_duplicates": error_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")
