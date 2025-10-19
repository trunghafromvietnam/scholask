from fastapi import APIRouter
from pathlib import Path
from app import rag

router = APIRouter(prefix="/dev", tags=["dev"])

@router.get("/rag-info")
def rag_info():
    base = Path(rag.INDEX_DIR)
    items = []
    if base.exists():
        for p in base.iterdir():
            if p.is_dir():
                items.append({
                    "slug": p.name,
                    "has_chunks": (p/"chunks.json").exists(),
                    "has_faiss": (p/"index.faiss").exists(),
                    "has_tfidf": (p/"tfidf.npy").exists(),
                })
    return {
        "INDEX_DIR": str(base),
        "schools": items
    }
