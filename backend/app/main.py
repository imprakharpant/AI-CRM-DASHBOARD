import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import customers, campaigns, ai, analytics
from .routes import auth
from .services.auth import get_current_user

# Create database tables (SQLite fallback initialization)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Xeno AI CRM Backend",
    description="Customer Engagement & AI Campaigns CRM Backend",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173", # Vite local port
    "http://localhost:3000", # Alternative local port
    "*",                     # Fallback / Deployed frontends
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(customers.router, dependencies=[Depends(get_current_user)])
app.include_router(campaigns.router, dependencies=[Depends(get_current_user)])
app.include_router(ai.router, dependencies=[Depends(get_current_user)])
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {
        "name": "Xeno AI CRM Backend API",
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv("ENV", "development")
    }
