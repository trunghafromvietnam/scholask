# app/routers/admin.py
from typing import Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    status,
    Query,  
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.deps import get_db
from app.auth import require_roles, hash_password, create_token
from app import rag
from app.models import School, User, Document, ServiceTicket

router = APIRouter(prefix="/admin", tags=["admin"])


class ProvisionIn(BaseModel):
    school_name: str
    slug: str
    owner_email: EmailStr
    owner_password: str


@router.post("/provision", status_code=status.HTTP_201_CREATED)
async def provision_school(payload: ProvisionIn, db: Session = Depends(get_db)):
    # 1) Check tồn tại
    if db.query(School).filter(School.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="School slug already taken.")
    if db.query(User).filter(User.email == payload.owner_email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # 2) Tạo trường + owner
    try:
        new_school = School(name=payload.school_name, slug=payload.slug)
        db.add(new_school)
        db.flush()

        new_owner = User(
            email=payload.owner_email,
            password_hash=hash_password(payload.owner_password),
            role="owner",
            school_id=new_school.id,
        )
        db.add(new_owner)
        db.commit()
        db.refresh(new_owner)

        token = create_token(sub=new_owner.email, role=new_owner.role, school_id=new_school.id)
        return {"token": token, "role": new_owner.role, "school_slug": new_school.slug}
    except Exception as e:
        db.rollback()
        print(f"Provisioning error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create school: {e}")


@router.post("/documents/ingest")
async def ingest(
    school: str = Form(...),  # school slug
    file: UploadFile = File(None),
    text: str | None = Form(None),
    url: str | None = Form(None),
    user_payload: dict = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    # Resolve school
    db_school = db.query(School).filter(School.slug == school).first()
    if not db_school:
        raise HTTPException(status_code=404, detail=f"School with slug '{school}' not found.")
    school_id = db_school.id

    print(f"Ingesting content for school: {school} (ID: {school_id})")
    content = ""
    source_type = ""
    source_description = ""
    file_name = None

    try:
        # Detect source
        if file:
            source_type = "upload"
            file_name = file.filename
            source_description = file_name
            content = await rag.load_content(file=file)
        elif text:
            source_type = "text"
            source_description = "Pasted Text"
            content = await rag.load_content(text=text)
        elif url:
            source_type = "url"
            source_description = url
            content = await rag.load_content(url=url)
        else:
            raise HTTPException(status_code=400, detail="No content provided.")

        if not content or not content.strip():
            raise HTTPException(status_code=400, detail="Could not load valid content.")

        # Chunk & index
        print(f"Content loaded ({len(content)} chars). Chunking...")
        chunks = rag.chunk_text(content)
        if not chunks:
            raise HTTPException(status_code=400, detail="Content resulted in zero chunks.")

        print(f"Obtained {len(chunks)} chunks. Embedding and indexing...")
        indexed_ids = await rag.embed_and_index(school, chunks)

        # Save Document record
        new_doc = Document(
            school_id=school_id,
            file_name=file_name,
            source_type=source_type,
            source_description=source_description,
            chunk_count=len(chunks),
            vector_count=len(indexed_ids),
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        print(f"Indexing complete. Saved Document record ID: {new_doc.id}")

        return {
            "ok": True,
            "document_id": new_doc.id,
            "chunks_created": len(chunks),
            "vectors_indexed": len(indexed_ids),
            "source": source_description,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"ERROR during ingest for school {school}: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")


@router.get("/documents")
async def list_documents(
    school: str,
    user_payload: dict = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    db_school = db.query(School).filter(School.slug == school).first()
    if not db_school:
        raise HTTPException(status_code=404, detail="School not found")

    # Order by created_at (ổn định, tránh lỗi thiếu updated_at trong DB)
    docs = (
        db.query(Document)
        .filter(Document.school_id == db_school.id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        {
            "id": doc.id,
            "fileName": doc.file_name,
            "sourceType": doc.source_type,
            "sourceDescription": doc.source_description,
            "chunkCount": doc.chunk_count,
            "vectorCount": doc.vector_count,
            "createdAt": doc.created_at.isoformat() if doc.created_at else None,
            "updatedAt": doc.updated_at.isoformat() if getattr(doc, "updated_at", None) else None,
        }
        for doc in docs
    ]


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    user_payload: dict = Depends(require_roles("owner", "admin")),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    user_school_id = user_payload.get("school_id")
    if doc.school_id != user_school_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot delete document from another school")

    try:
        school_slug = db.query(School.slug).filter(School.id == doc.school_id).scalar()

        db.delete(doc)
        db.commit()
        print(f"Deleted Document record ID: {doc_id} for school {school_slug}")
        return
    except Exception as e:
        db.rollback()
        print(f"ERROR deleting document {doc_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not delete document: {e}")


@router.post("/rag/reindex")
async def reindex(school: str = Form(...), _=Depends(require_roles("owner", "admin"))):
    return {"ok": True}


@router.get("/insights/summary")
async def insights_summary(db: Session = Depends(get_db), _=Depends(require_roles("owner", "admin", "analyst"))):
    # TODO: replace mock by real metrics
    return {
        "queries_per_day": [{"day": "2025-10-12", "count": 42}, {"day": "2025-10-13", "count": 58}],
        "avg_latency_ms": 920,
        "unanswered_pct": 6.7,
        "top_intents": [{"intent": "deadlines", "count": 19}, {"intent": "tuition", "count": 14}],
    }


def get_school_or_404(db: Session, school_slug: str) -> School:
    row = db.query(School).filter(School.slug == school_slug).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"School '{school_slug}' not found")
    return row


@router.get("/tickets")
def admin_list_tickets(
    school: str = Query(..., description="School slug, e.g. 'seattle-central-college'"),
    status: Optional[str] = Query(None, description="Filter by status, or 'All'"),
    department: Optional[str] = Query(None, description="Filter by department, or 'All'"),
    db: Session = Depends(get_db),
):
    school_row = get_school_or_404(db, school)

    q = db.query(ServiceTicket).filter(ServiceTicket.school_id == school_row.id)
    if status and status != "All":
        q = q.filter(ServiceTicket.status == status)
    if department and department != "All":
        q = q.filter(ServiceTicket.department == department)

    # An toàn: dùng created_at
    q = q.order_by(ServiceTicket.created_at.desc())

    tickets = q.all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "department": t.department,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if getattr(t, "updated_at", None) else None,
            "user_email": getattr(getattr(t, "requester", None), "email", None),
        }
        for t in tickets
    ]


@router.get("/tickets/{ticket_id}")
def admin_get_ticket(
    ticket_id: int,
    school: str = Query(..., description="School slug, e.g. 'seattle-central-college'"),
    db: Session = Depends(get_db),
):
    school_row = get_school_or_404(db, school)

    t = (
        db.query(ServiceTicket)
        .filter(ServiceTicket.id == ticket_id, ServiceTicket.school_id == school_row.id)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    form_payload = getattr(getattr(t, "form_submission", None), "payload_json", None)
    messages = []
    for m in getattr(t, "messages", []) or []:
        messages.append(
            {
                "id": m.id,
                "user_id": getattr(m, "user_id", None),
                "staff_id": getattr(m, "staff_id", None),
                "text": m.text,
                "is_internal": getattr(m, "is_internal", False),
                "created_at": m.created_at.isoformat() if getattr(m, "created_at", None) else None,
            }
        )

    return {
        "id": t.id,
        "title": t.title,
        "department": t.department,
        "status": t.status,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if getattr(t, "updated_at", None) else None,
        "requester_email": getattr(getattr(t, "requester", None), "email", None),
        "payload_json": form_payload,
        "messages": messages,
    }
