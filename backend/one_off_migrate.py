import os
from sqlalchemy import create_engine, text

url = os.getenv("DATABASE_URL", "sqlite:///./local.db")
eng = create_engine(url)

with eng.begin() as c:
    cols = [r[1] for r in c.execute(text("PRAGMA table_info(service_tickets)")).fetchall()]

    if "user_id" not in cols:
        c.execute(text("ALTER TABLE service_tickets ADD COLUMN user_id INTEGER"))
        print("Added column user_id to service_tickets")

    if "form_submission_id" not in cols:
        c.execute(text("ALTER TABLE service_tickets ADD COLUMN form_submission_id INTEGER"))
        print("Added column form_submission_id to service_tickets")

    if "updated_at" not in cols:
        c.execute(text("ALTER TABLE service_tickets ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
        print("Added column updated_at to service_tickets")

    # (tuỳ) các index hữu ích
    try:
        c.execute(text("CREATE INDEX IF NOT EXISTS ix_service_tickets_school_id ON service_tickets(school_id)"))
        c.execute(text("CREATE INDEX IF NOT EXISTS ix_service_tickets_status ON service_tickets(status)"))
        c.execute(text("CREATE INDEX IF NOT EXISTS ix_service_tickets_updated_at ON service_tickets(updated_at)"))
        print("Ensured helpful indexes on service_tickets")
    except Exception:
        pass

# Kiểm tra lại cột
with eng.begin() as c:
    cols = [r[1] for r in c.execute(text("PRAGMA table_info(service_tickets)")).fetchall()]
    print("service_tickets columns:", cols)