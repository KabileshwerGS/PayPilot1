import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# File location: backend/app/core/config.py
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent
WORKSPACE_DIR = BACKEND_DIR.parent

BACKEND_ENV = BACKEND_DIR / ".env"
WORKSPACE_ENV = WORKSPACE_DIR / ".env"

# Explicitly load .env files into os.environ regardless of terminal working directory
if BACKEND_ENV.exists():
    load_dotenv(BACKEND_ENV, override=False)
if WORKSPACE_ENV.exists():
    load_dotenv(WORKSPACE_ENV, override=False)
load_dotenv(".env", override=False)

class Settings(BaseSettings):
    PROJECT_NAME: str = "PayPilot Autonomous Back Office"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "paypilot-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    DATABASE_URL: str = "sqlite:///./paypilot.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if not v or not isinstance(v, str) or not v.strip():
            return "sqlite:///./paypilot.db"
        v = v.strip()
        if v.startswith("postgres://"):
            v = "postgresql+psycopg2://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+psycopg2://" + v[len("postgresql://"):]
        elif not v.startswith(("postgresql+", "sqlite://")):
            raise ValueError(
                "Unsupported DATABASE_URL scheme. PayPilot uses SQLAlchemy and requires a "
                "'postgresql://' (or 'postgres://' / 'sqlite://') connection URI — not an HTTP REST URL or MongoDB URI."
            )
        return cls._encode_unencoded_at_in_password(v)

    @staticmethod
    def _encode_unencoded_at_in_password(url: str) -> str:
        """Percent-encodes literal '@' in the DB password so URLs with '@' don't split the host."""
        if url.startswith("sqlite://") or "://" not in url:
            return url
        scheme, rest = url.split("://", 1)
        authority, sep, tail = rest.partition("/")
        if authority.count("@") > 1:
            userinfo, host_port = authority.rsplit("@", 1)
            if ":" in userinfo:
                username, raw_password = userinfo.split(":", 1)
                userinfo = f"{username}:{raw_password.replace('@', '%40')}"
                authority = f"{userinfo}@{host_port}"
                return f"{scheme}://{authority}{sep}{tail}"
        return url

    # PayPal configuration
    PAYPAL_MODE: str = "sandbox"  # 'sandbox' or 'live'
    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_WEBHOOK_ID: Optional[str] = None

    # Google Gemini AI configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.8-flash"

    # Email notification service
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "billing@paypilot.app"

    # Currency exchange rate service
    EXCHANGE_RATE_API_URL: str = "https://open.er-api.com/v6/latest"

    # Public Frontend Domain for sharing invoices (WhatsApp, links, client checkout)
    FRONTEND_PUBLIC_URL: Optional[str] = None
    FRONTEND_URL: Optional[str] = None

    # CORS configuration
    ALLOWED_ORIGINS: Optional[str] = None
    CORS_ORIGINS: Optional[str] = None

    @property
    def cors_origins_list(self) -> list[str]:
        default_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        origins = list(default_origins)
        raw_origins = self.ALLOWED_ORIGINS or self.CORS_ORIGINS
        if raw_origins:
            for item in raw_origins.split(","):
                clean = item.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        for front in [self.FRONTEND_URL, self.FRONTEND_PUBLIC_URL]:
            if front:
                clean = front.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        return origins

    model_config = SettingsConfigDict(
        env_file=(
            str(BACKEND_ENV),
            str(WORKSPACE_ENV),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

settings = Settings()

