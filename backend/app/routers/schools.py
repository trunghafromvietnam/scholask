from fastapi import APIRouter, HTTPException
from app import rag

router = APIRouter(prefix="/schools", tags=["schools"])

@router.get("/{school}/facts")
def get_facts(school: str):
    try:
        return rag.school_facts(school)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="No index for this school.")
