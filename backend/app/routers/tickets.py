from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.deps import get_db
from app.auth import require_roles
from app.models import ServiceTicket, User, Message as TicketMessage

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("/{department}")
def list_by_dept(department: str, school_id: int, _=Depends(require_roles("dept_admin","admin","owner")), db: Session = Depends(get_db)):
    q = db.query(ServiceTicket).filter(ServiceTicket.school_id==school_id, ServiceTicket.department==department).all()
    return [{"id":t.id,"title":t.title,"status":t.status,"payload":t.payload_json} for t in q]

@router.post("/{ticket_id}/status")
def update(ticket_id: int, payload: dict, _=Depends(require_roles("dept_admin","admin","owner")), db: Session = Depends(get_db)):
    t = db.query(ServiceTicket).get(ticket_id)
    if not t: return {"ok": False, "error": "not_found"}
    t.status = payload.get("status","open")
    db.add(t); db.commit()
    return {"ok": True}

class MessageIn(BaseModel):
    text: str
    is_internal: Optional[bool] = False

def _get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

@router.get("/{ticket_id}")
def get_ticket_detail(
    ticket_id: int,
    user_payload: dict = Depends(require_roles("owner", "admin", "dept_admin", "student", "applicant")),
    db: Session = Depends(get_db),
):
    t = db.query(ServiceTicket).filter(ServiceTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Nếu là student/applicant thì chỉ xem được ticket của mình
    role = user_payload.get("role")
    sub_email = user_payload.get("sub")
    if role in ("student", "applicant"):
        u = _get_user_by_email(db, sub_email)
        if not u or t.user_id != u.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    # Lấy email requester
    req_email = db.query(User.email).filter(User.id == t.user_id).scalar()

    # Build detail
    out = {
        "id": t.id,
        "title": t.title,
        "department": t.department,
        "status": t.status,
        "created_at": (t.created_at.isoformat() if t.created_at else None),
        "updated_at": (t.updated_at.isoformat() if t.updated_at else None),
        "requester_email": req_email,
        "payload_json": (t.submission.payload_json if t.submission else None),
        "messages": [{
            "id": m.id,
            "user_id": m.user_id,
            "staff_id": m.staff_id,
            "text": m.text,
            "is_internal": m.is_internal,
            "created_at": (m.created_at.isoformat() if m.created_at else None),
        } for m in t.messages],
    }
    return out

@router.post("/{ticket_id}/messages")
def add_ticket_message(
    ticket_id: int,
    payload: MessageIn,
    user_payload: dict = Depends(require_roles("owner","admin","dept_admin","student","applicant")),
    db: Session = Depends(get_db),
):
    t = db.query(ServiceTicket).filter(ServiceTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    role = user_payload.get("role")
    sub_email = user_payload.get("sub")
    author = _get_user_by_email(db, sub_email)
    if not author:
        raise HTTPException(status_code=400, detail="User not found")

    # Student/applicant chỉ gửi public message (is_internal luôn False)
    is_internal = bool(payload.is_internal and role in ("owner","admin","dept_admin"))

    msg = TicketMessage(
        ticket_id=t.id,
        text=payload.text.strip(),
        is_internal=is_internal,
        staff_id=(author.id if role in ("owner","admin","dept_admin") else None),
        user_id=(author.id if role in ("student","applicant") else None),
    )
    db.add(msg)

    # bump updated_at
    t.status = t.status  # no-op để kích hoạt onupdate; hoặc cập nhật status nếu muốn
    db.commit()
    db.refresh(msg)
    db.refresh(t)

    return {
        "id": msg.id,
        "ok": True,
        "created_at": (msg.created_at.isoformat() if msg.created_at else None),
        "is_internal": msg.is_internal,
    }
