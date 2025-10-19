import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.models import User

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")

# Tự chuyển Postgres URI sang psycopg3 nếu cần
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    
ENGINE = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# --- Auth helpers ---
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-please-make-this-long-and-random")
ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)

def _email_from_token(creds: HTTPAuthorizationCredentials | None) -> str | None:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return payload.get("sub")  # email
    except JWTError:
        return None

def get_current_user_optional(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    email = _email_from_token(creds)
    if not email:
        return None
    return db.query(User).filter(User.email == email).first()

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    email = _email_from_token(creds)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


