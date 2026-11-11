"""Integration and Security Tests for PayPilot Financial Intelligence Layer API

Tests:
1. Authentication requirements (401 Unauthorized without token).
2. Strict multi-tenant user data isolation.
3. Graceful degradation when Gemini is unconfigured.
4. Graceful handling of invalid or malformed Gemini JSON responses.
5. Successful Gemini structured recommendation synthesis.
6. Execution authorization, user ownership checks, and rejection of unauthorized actions.
7. Prevention of duplicate action execution via AuditLog.
"""

import os
os.environ["TESTING"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import json
from unittest.mock import patch, AsyncMock
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.core.security import create_access_token
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice
from backend.app.models.reminders import Reminder
from backend.app.models.notifications import Notification
from backend.app.models.audit_logs import AuditLog


@pytest.fixture
def test_setup():
    """Sets up an isolated in-memory SQLite database and test client."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    def override_get_db():
        s = TestingSessionLocal()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    # Seed User 1 and User 2
    user1 = User(id=1, email="user1@paypilot.io", hashed_password="pw1", full_name="User One", is_active=True)
    user2 = User(id=2, email="user2@paypilot.io", hashed_password="pw2", full_name="User Two", is_active=True)
    db_session = session
    db_session.add_all([user1, user2])

    biz1 = BusinessProfile(id=1, user_id=1, business_name="User1 Agency", owner_name="User One", email="user1@paypilot.io", default_currency="USD")
    biz2 = BusinessProfile(id=2, user_id=2, business_name="User2 Studios", owner_name="User Two", email="user2@paypilot.io", default_currency="USD")
    db_session.add_all([biz1, biz2])
    db_session.commit()

    token1 = create_access_token(user1.id)
    token2 = create_access_token(user2.id)

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    try:
        yield {
            "client": client,
            "db": session,
            "user1": user1,
            "user2": user2,
            "headers1": headers1,
            "headers2": headers2,
        }
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.clear()


def test_cockpit_requires_authentication(test_setup):
    """Calling /api/intelligence/cockpit without Bearer token must return 401."""
    client = test_setup["client"]
    res = client.get("/api/intelligence/cockpit")
    assert res.status_code == 401


def test_execute_requires_authentication(test_setup):
    """Calling /api/intelligence/recommendations/{id}/execute without Bearer token must return 401."""
    client = test_setup["client"]
    res = client.post("/api/intelligence/recommendations/rec_1/execute", json={
        "action_type": "DISPATCH_PAYMENT_REMINDER",
        "confirmed": True,
    })
    assert res.status_code == 401


def test_cockpit_user_data_isolation(test_setup):
    """User 1 must NEVER see User 2's invoices, clients, or overdue balances in the cockpit."""
    client = test_setup["client"]
    db = test_setup["db"]
    headers1 = test_setup["headers1"]

    # Seed an overdue invoice strictly for User 2
    c2 = Client(id=20, user_id=2, name="User2 Client Corp", email="c2@corp.com")
    db.add(c2)
    inv_u2 = Invoice(
        id=200,
        user_id=2,
        client_id=20,
        invoice_number="INV-U2-OVERDUE",
        issue_date="2026-09-01",
        due_date="2026-09-15",
        total_amount=Decimal("15000.00"),
        status="OVERDUE",
    )
    db.add(inv_u2)
    db.commit()

    # User 1 queries cockpit
    res1 = client.get("/api/intelligence/cockpit", headers=headers1)
    assert res1.status_code == 200
    data1 = res1.json()

    assert data1["user_id"] == 1
    assert data1["has_deficit_risk"] is False
    assert data1["financial_health_score"] == 100
    # Overdue list in anomalies must be empty for User 1
    overdue_anomalies = [a for a in data1["anomalies"] if a.get("category") == "COLLECTIONS"]
    assert len(overdue_anomalies) == 0


def test_cockpit_gemini_unconfigured_fallback(test_setup):
    """When Gemini is unconfigured, cockpit returns 200 OK with deterministic baseline recommendations."""
    client = test_setup["client"]
    headers1 = test_setup["headers1"]

    with patch("backend.app.api.intelligence.get_user_gemini_client") as mock_gemini:
        mock_client = mock_gemini.return_value
        mock_client.is_configured.return_value = False

        res = client.get("/api/intelligence/cockpit", headers=headers1)
        assert res.status_code == 200
        data = res.json()
        assert data["gemini_synthesis_status"] == "UNCONFIGURED"
        assert len(data["recommendations"]) >= 1
        assert data["recommendations"][0]["id"] == "rec_healthy_posture"


def test_cockpit_invalid_gemini_response_fallback(test_setup):
    """When Gemini returns malformed response or non-JSON text, falls back gracefully without 500 error."""
    client = test_setup["client"]
    headers1 = test_setup["headers1"]

    with patch("backend.app.api.intelligence.get_user_gemini_client") as mock_gemini:
        mock_client = mock_gemini.return_value
        mock_client.is_configured.return_value = True
        mock_client.generate_structured_insights = AsyncMock(return_value="I am an AI assistant and cannot produce JSON right now.")

        res = client.get("/api/intelligence/cockpit", headers=headers1)
        assert res.status_code == 200
        data = res.json()
        assert data["gemini_synthesis_status"] == "FALLBACK_DETERMINISTIC"
        assert len(data["recommendations"]) >= 1


def test_cockpit_gemini_synthesis_success(test_setup):
    """When Gemini returns valid structured JSON, recommendations are synthesized with executive insights."""
    client = test_setup["client"]
    headers1 = test_setup["headers1"]
    db = test_setup["db"]

    # Seed an overdue invoice for User 1
    c1 = Client(id=11, user_id=1, name="Acme Inc", email="acme@corp.com")
    db.add(c1)
    inv1 = Invoice(
        id=101,
        user_id=1,
        client_id=11,
        invoice_number="INV-2026-004",
        issue_date="2026-10-01",
        due_date="2026-10-15",
        total_amount=Decimal("4200.00"),
        status="OVERDUE",
    )
    db.add(inv1)
    db.commit()

    gemini_payload = json.dumps([
        {
            "id": "rec_overdue_INV-2026-004",
            "title": "Recover $4,200 Overdue from Acme Inc",
            "urgency": "HIGH",
            "financial_rationale": "Invoice INV-2026-004 is overdue by 26 days. Recovering this receivable protects liquidity buffer.",
            "quantified_impact": "Recover $4,200.00 cash",
            "recommended_action": "Dispatch automated reminder with PayPal payment link.",
            "action_type": "DISPATCH_PAYMENT_REMINDER",
            "is_prediction": False,
        }
    ])

    with patch("backend.app.api.intelligence.get_user_gemini_client") as mock_gemini:
        mock_client = mock_gemini.return_value
        mock_client.is_configured.return_value = True
        mock_client.generate_structured_insights = AsyncMock(return_value=gemini_payload)

        res = client.get("/api/intelligence/cockpit", headers=headers1)
        assert res.status_code == 200
        data = res.json()
        assert data["gemini_synthesis_status"] == "SYNTHESIZED"
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        assert rec["title"] == "Recover $4,200 Overdue from Acme Inc"
        assert rec["action_type"] == "DISPATCH_PAYMENT_REMINDER"
        assert rec["is_prediction"] is False


def test_execute_recommendation_requires_explicit_confirmation(test_setup):
    """Executing an action without confirmed=True must be rejected with 400 Bad Request."""
    client = test_setup["client"]
    headers1 = test_setup["headers1"]

    res = client.post("/api/intelligence/recommendations/rec_test/execute", headers=headers1, json={
        "action_type": "DISPATCH_PAYMENT_REMINDER",
        "action_payload": {},
        "confirmed": False,
    })
    assert res.status_code == 400
    assert "confirmation is mandatory" in res.json()["detail"].lower()


def test_execute_recommendation_forbids_monetary_movement(test_setup):
    """Automated monetary movement (payouts, refunds) must be rejected for financial safety."""
    client = test_setup["client"]
    headers1 = test_setup["headers1"]

    res = client.post("/api/intelligence/recommendations/rec_payout/execute", headers=headers1, json={
        "action_type": "INITIATE_PAYOUT",
        "action_payload": {"amount": 500},
        "confirmed": True,
    })
    assert res.status_code == 400
    assert "automated initiation of payments, payouts, or refunds is disabled" in res.json()["detail"].lower()


def test_execute_recommendation_authorization_and_ownership(test_setup):
    """User 1 cannot dispatch a reminder or alter records for User 2's invoice."""
    client = test_setup["client"]
    headers1 = test_setup["headers1"]
    db = test_setup["db"]

    # Invoice belongs to User 2
    c2 = Client(id=22, user_id=2, name="Client 2", email="c2@test.com")
    db.add(c2)
    inv2 = Invoice(id=202, user_id=2, client_id=22, invoice_number="INV-U2-999", issue_date="2026-10-01", due_date="2026-10-15", total_amount=Decimal("1000.00"), status="OVERDUE")
    db.add(inv2)
    db.commit()

    # User 1 attempts to execute for User 2's invoice ID
    res = client.post("/api/intelligence/recommendations/rec_hijack/execute", headers=headers1, json={
        "action_type": "DISPATCH_PAYMENT_REMINDER",
        "action_payload": {"invoice_id": 202},
        "confirmed": True,
    })
    assert res.status_code == 404
    assert "not found or unauthorized" in res.json()["detail"].lower()


def test_execute_recommendation_success_and_duplicate_prevention(test_setup):
    """Successful execution creates Reminder, Notification, and AuditLog, and blocks duplicate attempts."""
    client = test_setup["client"]
    headers1 = test_setup["headers1"]
    db = test_setup["db"]

    # Seed User 1 invoice
    c1 = Client(id=15, user_id=1, name="Apex Solutions", email="billing@apex.com")
    db.add(c1)
    inv1 = Invoice(id=105, user_id=1, client_id=15, invoice_number="INV-APEX-01", issue_date="2026-10-01", due_date="2026-10-15", total_amount=Decimal("3000.00"), status="OVERDUE")
    db.add(inv1)
    db.commit()

    rec_id = "rec_overdue_INV-APEX-01"

    # 1. First execution -> Must succeed
    res1 = client.post(f"/api/intelligence/recommendations/{rec_id}/execute", headers=headers1, json={
        "action_type": "DISPATCH_PAYMENT_REMINDER",
        "action_payload": {"invoice_id": 105, "invoice_number": "INV-APEX-01"},
        "confirmed": True,
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["recommendation_id"] == rec_id
    assert "audit_log_id" in data1

    # Verify Reminder was created in database
    reminder = db.query(Reminder).filter(Reminder.invoice_id == 105, Reminder.user_id == 1).first()
    assert reminder is not None
    assert reminder.status == "SENT"
    assert reminder.reminder_type == "AFTER_DUE"

    # Verify Notification was created
    notif = db.query(Notification).filter(Notification.user_id == 1, Notification.notification_type == "REMINDER_SENT").first()
    assert notif is not None
    assert "INV-APEX-01" in notif.message

    # Verify AuditLog was recorded
    audit = db.query(AuditLog).filter(AuditLog.user_id == 1, AuditLog.entity_id == rec_id).first()
    assert audit is not None
    assert audit.action == "DISPATCH_PAYMENT_REMINDER"

    # 2. Second execution attempt with identical recommendation ID -> Must return 409 Conflict
    res2 = client.post(f"/api/intelligence/recommendations/{rec_id}/execute", headers=headers1, json={
        "action_type": "DISPATCH_PAYMENT_REMINDER",
        "action_payload": {"invoice_id": 105, "invoice_number": "INV-APEX-01"},
        "confirmed": True,
    })
    assert res2.status_code == 409
    assert "already executed" in res2.json()["detail"].lower()
