import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:root@localhost:5432/crm_db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # PostgreSQL function to terminate other backends
        result = conn.execute(text("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'crm_db'
              AND pid <> pg_backend_pid();
        """))
        # Execute commit to ensure termination is applied
        conn.execute(text("COMMIT"))
        print("Successfully terminated conflicting PostgreSQL connections.")
except Exception as e:
    print(f"Error terminating connections: {e}")
