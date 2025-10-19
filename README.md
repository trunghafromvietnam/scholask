# Scholask (DubHacks 2025) - Ha Tran

**Scholask is a multi-tenant, AI-powered advisor designed to provide verified, 24/7 support for any educational institution.**

This project solves the problem of scattered information (websites, PDFs, policies) and slow manual processes (admissions, registrar requests) by creating a centralized, intelligent platform for students, parents, and staff.

## Key Features

*  **Verified RAG Pipeline:** Provides accurate, cited answers based *only* on the school's official ingested data (PDFs, docs, text). Vượt trội hơn LLM thông thường vì nó nắm rõ thông tin nội bộ.
*  **Real-time Workflows:** Transforms form submissions (e.g., International Applications, Transcript Requests) into trackable tickets, replacing slow email chains.
*  **Edge AI & Offline Mode (T-Mobile Track):** Utilizes a Raspberry Pi Edge Node to provide continuous service (using a fallback TF-IDF model) even when the cloud (AWS Bedrock) is unreachable due to network failure.
*  **Multilingual Support:** Automatically detects and responds in the user's language.
*  **Multi-Tenant & Secure:** Data is strictly isolated per school, with role-based access control (RBAC) for students, staff, and admins.

## Tech Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion, Recharts
* **Backend:** FastAPI (Python), SQLAlchemy, PostgreSQL
* **AI/RAG:** AWS Bedrock (Claude 3.5 Sonnet), FAISS (Vector Store), TF-IDF (Offline)
* **Edge Node:** Raspberry Pi 5 (T-Mobile Track)
* **Deployment:** Vercel (Frontend), Railway/Render (Backend)