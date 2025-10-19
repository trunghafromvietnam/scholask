from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional

# Auth
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class MagicIn(BaseModel):
    email: EmailStr
    school_slug: str

class TokenOut(BaseModel):
    token: str
    role: str | None = None

# Chat
class ChatIn(BaseModel):
    school: str
    question: str

class AskOut(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]

# Forms
class SubmitIn(BaseModel):
    payload: Dict[str, Any]

class OfflineItem(BaseModel):
    form_id: int
    payload: Dict[str, Any]

class OfflineSyncIn(BaseModel):
    items: List[OfflineItem]

# Tickets
class TicketUpdateIn(BaseModel):
    status: str

# Admin ingest
class IngestTextIn(BaseModel):
    school: str
    text: str
