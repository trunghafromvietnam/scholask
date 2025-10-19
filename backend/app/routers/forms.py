from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_user_optional
from app.auth import require_roles
from app.models import Form, FormSubmission, ServiceTicket, School, User
from datetime import datetime
from typing import Optional, Dict, Any

router = APIRouter(prefix="/forms", tags=["forms"])

class SubmitFormRequest(BaseModel):
    school_slug: str
    form_name: str
    payload: Dict[str, Any]

class SubmitPayload(BaseModel):
    school_slug: str
    form_name: str
    payload: dict

def get_department_from_form_name(form_name: str) -> str:
    """
    Determines the appropriate department based on the form name.
    *** CRITICAL: Customize this logic for your specific forms and departments! ***
    """
    name_lower = form_name.lower() 

    if "admission" in name_lower or "international" in name_lower:
        return "Admissions" 
    elif "transcript" in name_lower or "verification" in name_lower:
        return "Registrar"
    elif "deferral" in name_lower:
        return "Admissions"
    return "Student Services"

@router.get("/{school_slug}")
def list_forms(school_slug: str, db: Session = Depends(get_db)):
    return [
        {"id": 1, "name": "Transcript Request",
         "schema_json": {"fields":[{"name":"student_id"},{"name":"recipient_email"}]}}
    ]

@router.post("/submit")
def submit_form(
    payload: dict,
    db: Session = Depends(get_db),
    jwt = Depends(require_roles("student", "applicant"))
):
    # Lấy user/email/role/school_id từ JWT
    user_email = jwt["sub"]
    user_role  = jwt["role"]
    school_id  = jwt["school_id"]

    # Tìm User để lấy user_id (nếu có)
    user = db.query(User).filter(User.email == user_email, User.school_id == school_id).first()
    user_id = user.id if user else None  # applicant chưa có user có thể None

    # 1) Tạo FormSubmission (payload_json thuộc submission)
    submission = FormSubmission(
        form_id=None,                   
        user_id=user_id,              
        school_id=school_id,
        payload_json=payload,            
        status="submitted"
    )
    db.add(submission)
    db.flush()         # để có submission.id mà chưa commit
    db.refresh(submission)

    # 2) Tạo ServiceTicket (KHÔNG có payload_json)
    ticket = ServiceTicket(
        school_id=school_id,
        user_id=user_id,                    
        form_submission_id=submission.id,   
        department="International",          
        title=f"International Application - {user_email}",
        status="Open"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return {
        "id": submission.id,
        "status": submission.status,
        "ticket_id": ticket.id
    }

def infer_department(form_name: str, payload: Dict[str, Any]) -> str:
    # Map nhanh: tuỳ chỉnh theo nhu cầu
    name = form_name.lower()
    if "admission" in name or "international" in name:
        return "international"
    if "transcript" in name or "record" in name:
        return "registrar"
    return "student_services"

@router.post("/submit", status_code=status.HTTP_201_CREATED) # Thêm status code
async def submit_and_create_ticket(
    data: SubmitPayload,
    user_payload: dict = Depends(require_roles("applicant","student")), # Chỉ applicant/student submit
    db: Session = Depends(get_db)
):
    # Lấy thông tin user từ token payload
    user_email = user_payload.get("sub") 
    # Tìm user trong DB để lấy ID (cần thiết cho ForeignKey)
    db_user = db.query(User).filter(User.email == user_email).first()
    if not db_user:
         # Lỗi này không nên xảy ra nếu token hợp lệ
         raise HTTPException(status_code=404, detail="Submitting user not found in database.")
    user_id = db_user.id

    # Tìm school_id từ slug
    db_school = db.query(School).filter(School.slug == data.school_slug).first()
    if not db_school: raise HTTPException(status_code=404, detail="School not found")
    school_id = db_school.id

    # Tìm form_id (tạm thời hardcode)
    form_id = 1 if data.form_name == "International Application" else 2 if data.form_name == "Deferral Request" else 0
    if form_id == 0: raise HTTPException(status_code=400, detail="Invalid form name provided.")

    try:
        # 1. Tạo FormSubmission
        fs = FormSubmission(
            form_id=form_id,
            user_id=user_id, # Dùng user_id từ DB
            school_id=school_id,
            payload_json=data.payload,
            status="Submitted"
        )
        db.add(fs)
        db.flush() # Lấy fs.id

        # 2. Tạo ServiceTicket
        department = get_department_from_form_name(data.form_name)
        ticket = ServiceTicket(
            school_id=school_id,
            user_id=user_id, # Lưu user tạo ticket
            form_submission_id=fs.id, # Liên kết với submission
            department=department,
            title=f"{data.form_name} - Submission #{fs.id}",
            payload_json=data.payload, # Có thể bỏ qua nếu đã có ở submission
            status="Open" # Trạng thái ban đầu
        )
        db.add(ticket)
        db.commit() # Lưu cả hai
        db.refresh(fs)
        db.refresh(ticket)

        print(f"Form submitted (ID: {fs.id}), Ticket created (ID: {ticket.id}) for dept: {department}")
        
        # Trả về các ID cần thiết
        return {"ok": True, "submission_id": fs.id, "ticket_id": ticket.id, "status": fs.status}

    except Exception as e:
        db.rollback()
        print(f"ERROR during form submission/ticket creation: {e}")
        raise HTTPException(status_code=500, detail="Failed to process submission.")
    
from typing import List, Optional 
from pydantic import BaseModel as PydanticBaseModel 

class SubmissionSummary(PydanticBaseModel):
    id: int
    ticket_id: int | None
    form_name: str 
    created_at: datetime 
    status: str
    dept: Optional[str] = None 

    class Config:
        from_attributes = True

# Endpoint mới cho trang Tracking
@router.get("/my-submissions")
def my_submissions(school: str, db: Session = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    q = (
        db.query(FormSubmission, ServiceTicket, Form, School)
        .join(School, School.id == FormSubmission.school_id)
        .outerjoin(Form, Form.id == FormSubmission.form_id)
        .outerjoin(ServiceTicket, ServiceTicket.form_submission_id == FormSubmission.id)
        .filter(School.slug == school)
    )
    if user:
        q = q.filter(FormSubmission.user_id == user.id)

    rows = q.all()
    out = []
    for sub, ticket, form, _school in rows:
        out.append({
            "id": sub.id,
            "ticket_id": ticket.id if ticket else None,
            "form_name": form.name if form else "Request",
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "status": (ticket.status if ticket else sub.status),
            "dept": (ticket.department if ticket else None),
            "timeline": [],  # có thể bổ sung sau
        })
    return out

@router.post("/offline/sync")
def offline_sync(school_id: int, data: dict, user=Depends(require_roles("applicant","student","parent")), db: Session = Depends(get_db)):
    items = data.get("items", [])
    ids=[]
    for it in items:
        fs = FormSubmission(form_id=it.get("form_id"), user_id=user.get("sub"),
                            school_id=school_id, payload_json=it.get("payload"), status="submitted")
        db.add(fs); db.flush(); ids.append(fs.id)
    db.commit()
    return {"ok": True, "synced": ids}