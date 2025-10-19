import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.deps import ENGINE, ALLOWED_ORIGINS
from app.models import Base
from app.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.forms import router as forms_router
from app.routers.chat import router as chat_router
from app.routers.tickets import router as tickets_router
from app.routers.health import router as health_router
from app.routers import schools
from app.routers import dev

Base.metadata.create_all(bind=ENGINE)

app = FastAPI(title="Scholask Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(forms_router)
app.include_router(chat_router)
app.include_router(tickets_router)
app.include_router(schools.router)
app.include_router(dev.router)

@app.get("/healthz")
def healthz():
    return {"ok": True}


