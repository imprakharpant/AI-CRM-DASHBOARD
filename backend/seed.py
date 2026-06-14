import os
from dotenv import load_dotenv
load_dotenv()
from faker import Faker
from app.database import SessionLocal, engine, Base
from app.models import Customer, Order, User
from app.services.auth import get_password_hash
from datetime import date, timedelta
import random

# Drop and recreate tables to start fresh
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'crm_db'
              AND pid <> pg_backend_pid();
        """))
        conn.execute(text("COMMIT"))
    print("Terminated other active connections to crm_db before dropping tables.")
except Exception as e:
    print(f"Error terminating connections: {e}")

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

fake = Faker("en_IN")
db = SessionLocal()

try:
    # Seed default admin user if not exists
    admin = db.query(User).filter(User.email == "admin@xeno.ai").first()
    if not admin:
        admin = User(
            name="Administrator",
            email="admin@xeno.ai",
            hashed_password=get_password_hash("admin123")
        )
        db.add(admin)
        db.flush()
        print("Default admin user (admin@xeno.ai / admin123) seeded.")

    customers = []
    for _ in range(1000):
        customer = Customer(
            name=fake.name(),
            email=fake.unique.email(),
            phone=str(random.randint(6000000000, 9999999999)),
            total_spend=0.0,
            last_purchase_date=None
        )
        db.add(customer)
        customers.append(customer)

    db.flush()  # Populate customer IDs before creating orders

    total_orders = 0
    for customer in customers:
        num_orders = random.randint(1, 10)
        customer_total_spend = 0.0
        latest_purchase_date = None

        for _ in range(num_orders):
            order_date = fake.date_between(start_date='-1y', end_date='today')
            amount = round(random.uniform(200, 10000), 2)

            order = Order(
                customer_id=customer.id,
                amount=amount,
                order_date=order_date
            )
            db.add(order)
            total_orders += 1

            customer_total_spend += amount
            if latest_purchase_date is None or order_date > latest_purchase_date:
                latest_purchase_date = order_date

        customer.total_spend = round(customer_total_spend, 2)
        customer.last_purchase_date = latest_purchase_date

    db.commit()
    print(f"1000 customers and {total_orders} orders inserted successfully!")
except Exception as e:
    db.rollback()
    print(f"Error seeding database: {e}")
finally:
    db.close()
