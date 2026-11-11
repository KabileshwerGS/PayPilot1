from typing import Any, Dict
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

db_url = settings.DATABASE_URL
engine_kwargs: Dict[str, Any] = {
    "pool_pre_ping": True,
}

if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL / Supabase Session Pooler configuration
    connect_args: Dict[str, Any] = {
        "connect_timeout": 15,
    }
    if "sslmode=" not in db_url.lower():
        connect_args["sslmode"] = "require"
    
    engine_kwargs["connect_args"] = connect_args
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(
    db_url,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

