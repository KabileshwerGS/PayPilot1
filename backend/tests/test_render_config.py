"""Tests for Render deployment configuration, database URL validation, and health check."""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from backend.app.core.config import Settings
from backend.app.main import app


def test_database_url_normalization_and_defaults():
    assert Settings.assemble_db_connection(None) == "sqlite:///./paypilot.db"
    assert Settings.assemble_db_connection("   ") == "sqlite:///./paypilot.db"
    assert (
        Settings.assemble_db_connection("postgres://user:pass@host:5432/db")
        == "postgresql+psycopg2://user:pass@host:5432/db"
    )
    assert (
        Settings.assemble_db_connection("postgresql://user:pass@host:6543/postgres?sslmode=require")
        == "postgresql+psycopg2://user:pass@host:6543/postgres?sslmode=require"
    )
    assert (
        Settings.assemble_db_connection("sqlite:///./custom.db")
        == "sqlite:///./custom.db"
    )

    normalized = Settings.assemble_db_connection("postgresql://user:Pass@123@host.example.com:6543/postgres")
    parsed = make_url(normalized)
    assert parsed.host == "host.example.com"
    assert parsed.port == 6543
    assert parsed.password == "Pass@123"


@pytest.mark.parametrize(
    "bad_url",
    [
        "https://example.supabase.co/rest/v1/",
        "http://localhost:8000",
        "mongodb+srv://user:pass@cluster.mongodb.net/",
    ],
)
def test_database_url_rejects_non_sql_schemes(bad_url: str):
    with pytest.raises(ValueError, match="Unsupported DATABASE_URL scheme"):
        Settings.assemble_db_connection(bad_url)


def test_cors_origins_strips_trailing_slashes():
    cfg = Settings(
        ALLOWED_ORIGINS="https://paypilot.vercel.app/, http://custom.example.com/ ",
        FRONTEND_URL="https://app.example.com/",
    )
    assert "https://paypilot.vercel.app" in cfg.cors_origins_list
    assert "http://custom.example.com" in cfg.cors_origins_list
    assert "https://app.example.com" in cfg.cors_origins_list


def test_health_check_connected_and_disconnected():
    client = TestClient(app)
    res_ok = client.get("/api/health")
    assert res_ok.status_code == 200
    assert res_ok.json() == {
        "status": "healthy",
        "service": "PayPilot Backend Engine",
        "database": "connected",
    }

    with patch("backend.app.main.engine.connect", side_effect=RuntimeError("db down")):
        res_fail = client.get("/api/health")
    assert res_fail.status_code == 503
    assert res_fail.json() == {
        "status": "unhealthy",
        "service": "PayPilot Backend Engine",
        "database": "disconnected",
    }

