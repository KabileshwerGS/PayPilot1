import os
import sys
from pathlib import Path

# Ensure both repository root and backend directory are in sys.path
_current_dir = Path(__file__).resolve().parent  # backend/app
_backend_dir = _current_dir.parent             # backend
_root_dir = _backend_dir.parent                # paypilot root

for _path in [str(_root_dir), str(_backend_dir)]:
    if _path not in sys.path:
        sys.path.insert(0, _path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.core.database import engine, Base
import backend.app.models  # Ensure all models are registered

# Create database tables automatically if not in automated test mode
if os.environ.get("TESTING") != "1":
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database schema check deferred or offline: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
)

# Configure CORS for local development and deployed environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
from backend.app.api.auth import router as auth_router
from backend.app.api.business import router as business_router
from backend.app.api.clients import router as clients_router
from backend.app.api.invoices import router as invoices_router, public_router as public_invoices_router
from backend.app.api.payments import router as payments_router, webhook_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.ai import router as ai_router
from backend.app.api.reminders import router as reminders_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.notifications import router as notifications_router
from backend.app.api.settings import router as settings_router
from backend.app.api.staff import router as staff_router
from backend.app.api.services import router as services_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.payouts import router as payouts_router
from backend.app.api.creators import router as creators_router, public_router as public_creators_router
from backend.app.api.marketplace import router as marketplace_router, public_router as public_marketplace_router
from backend.app.api.pos import router as pos_router, public_router as public_pos_router
from backend.app.api.intelligence import router as intelligence_router

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(business_router, prefix=settings.API_V1_STR)
app.include_router(clients_router, prefix=settings.API_V1_STR)
app.include_router(invoices_router, prefix=settings.API_V1_STR)
app.include_router(public_invoices_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)
app.include_router(webhook_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(reminders_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(staff_router, prefix=settings.API_V1_STR)
app.include_router(services_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)
app.include_router(payouts_router, prefix=settings.API_V1_STR)
app.include_router(creators_router, prefix=settings.API_V1_STR)
app.include_router(public_creators_router, prefix=settings.API_V1_STR)
app.include_router(marketplace_router, prefix=settings.API_V1_STR)
app.include_router(public_marketplace_router, prefix=settings.API_V1_STR)
app.include_router(pos_router, prefix=settings.API_V1_STR)
app.include_router(public_pos_router, prefix=settings.API_V1_STR)
app.include_router(intelligence_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "PayPilot Backend Engine",
            "database": "connected",
        }
    except Exception as e:
        print(f"Health check database error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "PayPilot Backend Engine",
                "database": "disconnected",
            },
        )

