import os
import logging
from datetime import datetime, timedelta, timezone 
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr 
from app.deps import get_db
from app.models import User, School

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-please-make-this-long-and-random") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

security = HTTPBearer()
router = APIRouter(prefix="/auth", tags=["auth"])

# Sử dụng Argon2 làm scheme mặc định, bcrypt làm fallback
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# Hashing
def hash_password(pw: str) -> str:
    """Hashes a password using the preferred scheme (Argon2)."""
    try:
        return pwd_context.hash(pw)
    except Exception as e:
        print(f"ERROR: Password hashing failed: {e}") # Log lỗi
        # Trả về lỗi chung cho client
        raise HTTPException(status_code=500, detail="Internal server error during password processing.")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a stored hash (Argon2 or Bcrypt)."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"WARN: Password verification failed: {e}")
        return False

# TOKEN
def create_token(sub: str, role: str, school_id: int, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    """Creates a JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": sub, # email
        "role": role,
        "school_id": school_id,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency for Role-Based Access Control ---
def require_roles(*roles: str): 
    """Dependency to verify JWT and check user roles."""
    async def verifier(creds: HTTPAuthorizationCredentials = Depends(security)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        forbidden_exception = HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted for your role",
        )
        try:
            payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[ALGORITHM])
            user_email: str | None = payload.get("sub")
            user_role: str | None = payload.get("role")
            if user_email is None or user_role is None:
                print("WARN: Token missing required claims (sub, role)")
                raise credentials_exception
        except JWTError as e:
            print(f"WARN: JWT Decode Error: {e}")
            raise credentials_exception
        
        # Check if the user's role is in the allowed roles
        if roles and user_role not in roles:
            print(f"WARN: Forbidden access for role '{user_role}'. Required: {roles}")
            raise forbidden_exception
            
        return payload 
    return verifier

# Authentication Endpoints 

class LoginRequest(BaseModel): # pydantic
    email: EmailStr
    password: str

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Logs in a user and returns JWT, role, AND school slug."""
    logger.info(f"Login attempt for email: {payload.email}") # Log attempt start

    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        logger.warning(f"Login failed: User not found for email {payload.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    logger.info(f"User found: ID={user.id}, Role={user.role}, SchoolID={user.school_id}") # Log user details

    if not verify_password(payload.password, user.password_hash):
        logger.warning(f"Login failed: Incorrect password for email {payload.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Query for School Slug with explicit checks
    school_slug: str | None = None
    if user.school_id is not None: # Check if school_id exists
        logger.info(f"Querying school slug for school_id: {user.school_id}")
        # Use scalar() to directly get the slug value or None
        school_slug_result = db.query(School.slug).filter(School.id == user.school_id).scalar()

        if school_slug_result:
            school_slug = school_slug_result
            logger.info(f"Found school slug: '{school_slug}' for school_id {user.school_id}")
        else:
            # Log if the school ID exists on the user but not in the schools table
            logger.error(f"CRITICAL: User {user.email} (ID: {user.id}) has school_id {user.school_id}, but no matching school found in the database!")
            raise HTTPException(status_code=500, detail="User account is linked to a non-existent school.")
    else:
        logger.warning(f"User {user.email} (ID: {user.id}) does not have an associated school_id.")

    # Create token
    try:
        token = create_token(sub=user.email, role=user.role, school_id=user.school_id)
    except Exception as e:
        logger.error(f"Failed to create JWT token: {e}")
        raise HTTPException(status_code=500, detail="Could not create authentication token.")

    response_payload = {
        "token": token,
        "role": user.role,
        "school_slug": school_slug # Include the found slug (or None)
    }
    logger.info(f"Login successful. Returning payload: {response_payload}")

    return response_payload


class StudentRegisterRequest(BaseModel):
     # name: str # Bỏ qua nếu model User không có cột 'name'
     email: EmailStr
     password: str
     school_slug: str
     role: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_student(payload: StudentRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new student for a specific school."""
    # 1. Tìm trường học
    school = db.query(School).filter(School.slug == payload.school_slug).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"School '{payload.school_slug}' not found.")

    # 2. Kiểm tra email đã tồn tại cho trường này chưa
    existing_user = db.query(User).filter(User.email == payload.email, User.school_id == school.id).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered for this school.")
    
    # Kiểm tra role hợp lệ
    allowed_roles = ["student", "applicant"]
    if payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role provided. Must be one of: {allowed_roles}")

    # 3. Tạo user student mới
    try:
        new_student = User(
            email=payload.email,
            password_hash=hash_password(payload.password), # Argon2
            role=payload.role, 
            school_id=school.id
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)

        # 4. Tạo token và trả về
        token = create_token(sub=new_student.email, role=new_student.role, school_id=school.id)
        print(f"Student registered successfully: {new_student.email} for school {school.slug}")
        return {"token": token, "role": new_student.role}

    except Exception as e:
        db.rollback()
        print(f"ERROR: Student registration failed: {e}")
        raise HTTPException(status_code=500, detail="Could not register student due to an internal error.")

# !!! Cần TĂNG BẢO MẬT khi PRODUCTION !!!
class MagicRequest(BaseModel):
    email: EmailStr
    school_slug: str

@router.post("/magic")
def magic(payload: MagicRequest, db: Session = Depends(get_db)):
    """Generates a temporary 'applicant' token (demo purposes)."""
    school = db.query(School).filter(School.slug==payload.school_slug).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")
    
    # Tạo token 'applicant' không cần mật khẩu
    token = create_token(sub=payload.email, role="applicant", school_id=school.id)
    return {"token": token}
