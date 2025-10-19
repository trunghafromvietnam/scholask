from fastapi import APIRouter
from datetime import datetime, timezone
import os

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
def health_root():
    return {
        "ok": True,
        "mode": "offline" if os.getenv("OFFLINE_MODE", "0") == "1" else "cloud",
        "ts": datetime.now(timezone.utc).isoformat()
    }

@router.get("/ping")
def health_ping():
    return {"ok": True}

