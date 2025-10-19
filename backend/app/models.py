from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func

Base = declarative_base()

class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)   
    subdomain = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    users = relationship("User", back_populates="school", cascade="all, delete-orphan") 
    documents = relationship("Document", back_populates="school", cascade="all, delete-orphan")
    forms = relationship("Form", back_populates="school", cascade="all, delete-orphan") 
    submissions = relationship("FormSubmission", back_populates="school", cascade="all, delete-orphan")
    tickets = relationship("ServiceTicket", back_populates="school", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)     # owner, admin, analyst, dept_admin, student, applicant, parent
    department = Column(String)               # admissions, international, registrar, fin_aid, advising
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"))
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    school = relationship("School", back_populates="users")
    submissions = relationship("FormSubmission", back_populates="submitter", cascade="all, delete-orphan")
    tickets_created = relationship("ServiceTicket", back_populates="requester", cascade="all, delete-orphan") 
    messages_sent = relationship("Message", back_populates="author", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    
    file_name = Column(String) 
    source_type = Column(String, nullable=False)
    source_description = Column(String) 
    
    chunk_count = Column(Integer)
    vector_count = Column(Integer)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now()) 

    # Relationship
    school = relationship("School", back_populates="documents")

class Query(Base):
    __tablename__ = "queries"
    id = Column(Integer, primary_key=True)
    school_id = Column(Integer)
    user_id = Column(Integer)
    question = Column(Text)
    answer = Column(Text)
    sources = Column(JSON)         
    rating = Column(Integer)       
    latency_ms = Column(Integer)
    model_id = Column(String)
    created_at = Column(DateTime, server_default=func.now())

class Form(Base):
    __tablename__ = "forms"
    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    schema_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    school = relationship("School", back_populates="forms")
    submissions = relationship("FormSubmission", back_populates="form")

class FormSubmission(Base): # Thêm relationship ngược lại User, School, Form
    __tablename__ = "form_submissions"
    id = Column(Integer, primary_key=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="SET NULL"), nullable=True) 
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True) 
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True) 
    payload_json = Column(JSON, nullable=False)
    status = Column(String, default="submitted", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    form = relationship("Form", back_populates="submissions")
    submitter = relationship("User", back_populates="submissions")
    school = relationship("School", back_populates="submissions")
    service_ticket = relationship("ServiceTicket", back_populates="submission", uselist=False, cascade="all, delete-orphan")

class ServiceTicket(Base): # Thêm relationship ngược lại User, School, FormSubmission
    __tablename__ = "service_tickets"
    id = Column(Integer, primary_key=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True) # ID người tạo
    form_submission_id = Column(Integer, ForeignKey("form_submissions.id", ondelete="SET NULL"), unique=True, nullable=True, index=True) # Liên kết submission (cho phép null)

    department = Column(String, index=True)
    title = Column(String)
    status = Column(String, default="Open", index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    school = relationship("School", back_populates="tickets")
    requester = relationship("User", back_populates="tickets_created") 
    submission = relationship("FormSubmission", back_populates="service_ticket")
    messages = relationship("Message", back_populates="ticket", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("service_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # ID của người gửi (student hoặc staff)
    text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ticket = relationship("ServiceTicket", back_populates="messages")
    author = relationship("User", back_populates="messages_sent") 
