import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy.orm import Session
from backend.app.deps import ENGINE, SessionLocal
from backend.app.models import Base, School, User, Form
from backend.app.auth import hash_password

def main():
    Base.metadata.create_all(bind=ENGINE)
    db: Session = SessionLocal()

    s = db.query(School).filter(School.slug=="scc").first()
    if not s:
        s = School(name="Seattle Central College", slug="scc", subdomain="scc")
        db.add(s); db.commit(); db.refresh(s)
        print("Created school scc:", s.id)

    # Owner & department admins (default pwd "scholask")
    def ensure_user(email, role, dept=None):
        u = db.query(User).filter(User.email==email).first()
        if not u:
            u = User(email=email, password_hash=hash_password("scholask"), role=role, department=dept, school_id=s.id)
            db.add(u)
    ensure_user("owner@scc.edu", "owner")
    for dep in ["admissions","international","registrar","fin_aid","advising"]:
        ensure_user(f"{dep}@scc.edu", "dept_admin", dep)
    db.commit()

    # Forms
    if not db.query(Form).filter(Form.school_id==s.id, Form.name=="Transcript Request").first():
        schema = {"fields":[{"name":"student_id"},{"name":"recipient_email"}]}
        db.add(Form(school_id=s.id, name="Transcript Request", schema_json=schema))
        db.commit()

    print("Seed done.")

if __name__ == "__main__":
    main()
