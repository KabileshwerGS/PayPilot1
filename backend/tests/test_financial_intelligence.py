"""Unit Tests for PayPilot Financial Intelligence Layer Service

Tests cover:
- calculate_debtor_profiles: delays, trends, risk tiers, and user isolation
- forecast_cash_flow: daily simulation, reliability weighting, deficit alerts, runway, and isolation
- detect_anomalies: concentration risk, velocity shifts, aging debt, baseline suppression, and isolation
- Empty state and missing data safety (no invented history)
"""

import pytest
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.database import Base
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice
from backend.app.models.payments import Payment
from backend.app.models.payouts import Payout
from backend.app.models.creators import CreatorProfile, Tip
from backend.app.models.marketplace import MarketplaceOrder, VendorPayout
from backend.app.models.pos import POSOrder

from backend.app.services.financial_intelligence import (
    calculate_debtor_profiles,
    forecast_cash_flow,
    detect_anomalies,
    parse_date_safe,
    get_conversion_rate,
)


@pytest.fixture
def db_session():
    """Provides a fresh, isolated in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_parse_date_safe_edge_cases():
    """Verifies that date parsing never crashes on varied formats or corrupt inputs."""
    assert parse_date_safe(None) is None
    assert parse_date_safe("") is None
    assert parse_date_safe("   ") is None
    assert parse_date_safe("invalid-string") is None
    assert parse_date_safe("2026-11-15") == date(2026, 11, 15)
    assert parse_date_safe("2026-11-15 14:30:00") == date(2026, 11, 15)
    assert parse_date_safe("2026-11-15T14:30:00Z") == date(2026, 11, 15)
    assert parse_date_safe(datetime(2026, 11, 15, 10, 0, 0)) == date(2026, 11, 15)
    assert parse_date_safe(date(2026, 11, 15)) == date(2026, 11, 15)


def test_debtor_profiles_empty_database(db_session):
    """A user with no clients or invoices should return an empty profile list safely."""
    result = calculate_debtor_profiles(user_id=999, db=db_session)
    assert result["user_id"] == 999
    assert len(result["profiles"]) == 0
    assert result["summary"]["total_clients"] == 0
    assert result["summary"]["portfolio_average_delay_days"] is None


def test_debtor_profiles_insufficient_data_no_invented_history(db_session):
    """Clients with 0 paid invoices must be marked INSUFFICIENT_DATA without invented stats."""
    user = User(id=1, email="test@paypilot.io", hashed_password="pw", full_name="Tester")
    db_session.add(user)
    client = Client(id=10, user_id=1, name="Acme Corp", email="contact@acme.com")
    db_session.add(client)
    db_session.commit()

    result = calculate_debtor_profiles(user_id=1, db=db_session)
    assert len(result["profiles"]) == 1
    p = result["profiles"][0]
    assert p["client_name"] == "Acme Corp"
    assert p["paid_invoices_count"] == 0
    assert p["average_payment_delay_days"] is None
    assert p["on_time_payment_rate_pct"] is None
    assert p["payment_trend"] == "NO_PAYMENT_HISTORY"
    assert p["risk_tier"] == "INSUFFICIENT_DATA"
    assert p["reliability_score"] == 0.75


def test_debtor_profiles_on_time_and_chronic_late_clients(db_session):
    """Calculates empirical delays, reliability scores, trends, and risk tiers accurately."""
    user = User(id=1, email="agency@paypilot.io", hashed_password="pw", full_name="Agency User")
    db_session.add(user)

    client_fast = Client(id=101, user_id=1, name="Punctual Corp", email="punctual@corp.com")
    client_slow = Client(id=102, user_id=1, name="Late Inc", email="late@inc.com")
    db_session.add_all([client_fast, client_slow])
    db_session.commit()

    # Client Fast: 3 invoices paid early or on time
    inv1 = Invoice(id=1, user_id=1, client_id=101, invoice_number="INV-001", issue_date="2026-10-01", due_date="2026-10-15", total_amount=Decimal("1000.00"), status="PAID")
    inv2 = Invoice(id=2, user_id=1, client_id=101, invoice_number="INV-002", issue_date="2026-10-15", due_date="2026-10-30", total_amount=Decimal("1000.00"), status="PAID")
    inv3 = Invoice(id=3, user_id=1, client_id=101, invoice_number="INV-003", issue_date="2026-11-01", due_date="2026-11-15", total_amount=Decimal("1000.00"), status="PAID")

    pay1 = Payment(id=1, user_id=1, invoice_id=1, client_id=101, transaction_id="TXN-1", amount=Decimal("1000.00"), currency="USD", payment_date="2026-10-12", status="COMPLETED") # -3 days
    pay2 = Payment(id=2, user_id=1, invoice_id=2, client_id=101, transaction_id="TXN-2", amount=Decimal("1000.00"), currency="USD", payment_date="2026-10-30", status="COMPLETED") # 0 days
    pay3 = Payment(id=3, user_id=1, invoice_id=3, client_id=101, transaction_id="TXN-3", amount=Decimal("1000.00"), currency="USD", payment_date="2026-11-14", status="COMPLETED") # -1 day

    # Client Slow: 2 invoices paid heavily late (+18 days, +22 days)
    inv4 = Invoice(id=4, user_id=1, client_id=102, invoice_number="INV-004", issue_date="2026-09-01", due_date="2026-09-15", total_amount=Decimal("2500.00"), status="PAID")
    inv5 = Invoice(id=5, user_id=1, client_id=102, invoice_number="INV-005", issue_date="2026-10-01", due_date="2026-10-15", total_amount=Decimal("2500.00"), status="PAID")

    pay4 = Payment(id=4, user_id=1, invoice_id=4, client_id=102, transaction_id="TXN-4", amount=Decimal("2500.00"), currency="USD", payment_date="2026-10-03", status="COMPLETED") # +18 days
    pay5 = Payment(id=5, user_id=1, invoice_id=5, client_id=102, transaction_id="TXN-5", amount=Decimal("2500.00"), currency="USD", payment_date="2026-11-06", status="COMPLETED") # +22 days

    db_session.add_all([inv1, inv2, inv3, inv4, inv5, pay1, pay2, pay3, pay4, pay5])
    db_session.commit()

    result = calculate_debtor_profiles(user_id=1, db=db_session)
    profiles = {p["client_id"]: p for p in result["profiles"]}

    fast_p = profiles[101]
    assert fast_p["paid_invoices_count"] == 3
    assert fast_p["average_payment_delay_days"] < 0.0  # Paid early on average
    assert fast_p["on_time_payment_rate_pct"] == 100.0
    assert fast_p["risk_tier"] == "LOW_RISK"
    assert fast_p["reliability_score"] >= 0.85

    slow_p = profiles[102]
    assert slow_p["paid_invoices_count"] == 2
    assert slow_p["average_payment_delay_days"] == 20.0  # mean(18, 22)
    assert slow_p["on_time_payment_rate_pct"] == 0.0
    assert slow_p["risk_tier"] == "HIGH_RISK"
    assert slow_p["reliability_score"] <= 0.50


def test_debtor_profiles_strict_user_isolation(db_session):
    """User 1 must NEVER see or calculate debtor profiles from User 2."""
    user1 = User(id=1, email="u1@test.com", hashed_password="pw", full_name="User 1")
    user2 = User(id=2, email="u2@test.com", hashed_password="pw", full_name="User 2")
    db_session.add_all([user1, user2])

    c1 = Client(id=1, user_id=1, name="User1 Client", email="c1@u1.com")
    c2 = Client(id=2, user_id=2, name="User2 Client", email="c2@u2.com")
    db_session.add_all([c1, c2])

    inv_u2 = Invoice(id=10, user_id=2, client_id=2, invoice_number="U2-INV", issue_date="2026-11-01", due_date="2026-11-15", total_amount=Decimal("5000.00"), status="PAID")
    pay_u2 = Payment(id=10, user_id=2, invoice_id=10, client_id=2, transaction_id="U2-TXN", amount=Decimal("5000.00"), currency="USD", payment_date="2026-11-15", status="COMPLETED")
    db_session.add_all([inv_u2, pay_u2])
    db_session.commit()

    res_u1 = calculate_debtor_profiles(user_id=1, db=db_session)
    assert len(res_u1["profiles"]) == 1
    assert res_u1["profiles"][0]["client_name"] == "User1 Client"
    assert res_u1["profiles"][0]["paid_invoices_count"] == 0
    assert res_u1["summary"]["total_clients"] == 1


def test_cash_flow_forecast_empty_database(db_session):
    """Handles new accounts with 0 transactions without errors or crashes."""
    res = forecast_cash_flow(user_id=999, db=db_session, horizon_days=30)
    assert res["user_id"] == 999
    assert res["starting_verified_balance"] == 0.0
    assert res["has_deficit_risk"] is False
    assert len(res["timeline"]) == 31  # Day 0 to 30
    assert res["data_classification"]["actual_confirmed_balance"] is True


def test_cash_flow_forecast_deficit_detection_and_runway(db_session):
    """Detects impending cash-flow deficits when outgoing obligations exceed reserves."""
    user = User(id=1, email="agency@paypilot.io", hashed_password="pw", full_name="Agency")
    db_session.add(user)

    # Starting balance: $500 verified payment
    pay = Payment(id=1, user_id=1, invoice_id=1, client_id=1, transaction_id="TXN-START", amount=Decimal("500.00"), currency="USD", payment_date="2026-11-05", status="COMPLETED")
    db_session.add(pay)

    # Large outgoing staff payout due in 4 days: $1,200 (causing a $700 deficit!)
    today = datetime.now(timezone.utc).date()
    payout_due = today + timedelta(days=4)
    payout = Payout(
        id=1,
        user_id=1,
        staff_id=1,
        payout_reference="PO-TEST-001",
        amount=Decimal("1200.00"),
        currency="USD",
        status="APPROVED",
        period_end=payout_due.isoformat(),
    )
    db_session.add(payout)
    db_session.commit()

    res = forecast_cash_flow(user_id=1, db=db_session, horizon_days=30)
    assert res["starting_verified_balance"] == 500.0
    assert res["has_deficit_risk"] is True
    assert res["earliest_deficit_date"] == payout_due.isoformat()
    assert res["minimum_projected_balance"] == -700.0
    assert res["projected_runway_days"] == 4


def test_cash_flow_user_isolation(db_session):
    """User 1's forecast must never incorporate User 2's payments, receivables, or payouts."""
    u1 = User(id=1, email="u1@test.com", hashed_password="pw", full_name="U1")
    u2 = User(id=2, email="u2@test.com", hashed_password="pw", full_name="U2")
    db_session.add_all([u1, u2])

    # User 2 has $100,000 payment and $50,000 payout
    pay_u2 = Payment(id=20, user_id=2, invoice_id=2, client_id=2, transaction_id="TXN-U2", amount=Decimal("100000.00"), currency="USD", payment_date="2026-11-01", status="COMPLETED")
    payout_u2 = Payout(id=20, user_id=2, staff_id=2, payout_reference="PO-U2", amount=Decimal("50000.00"), currency="USD", status="PENDING")
    db_session.add_all([pay_u2, payout_u2])
    db_session.commit()

    res_u1 = forecast_cash_flow(user_id=1, db=db_session, horizon_days=30)
    assert res_u1["starting_verified_balance"] == 0.0
    assert res_u1["totals"]["total_known_outflows"] == 0.0


def test_detect_anomalies_insufficient_baseline_suppression(db_session):
    """Does not fire false alarms for newly registered accounts with minimal data."""
    u = User(id=1, email="new@user.com", hashed_password="pw", full_name="New User")
    db_session.add(u)
    db_session.commit()

    res = detect_anomalies(user_id=1, db=db_session)
    assert res["total_anomalies_detected"] == 0
    assert len(res["insufficient_baseline_notes"]) >= 1


def test_detect_anomalies_critical_revenue_concentration(db_session):
    """Detects when a single client exceeds 70% of lifetime collections across multiple payments."""
    user = User(id=1, email="biz@user.com", hashed_password="pw", full_name="Biz")
    c1 = Client(id=1, user_id=1, name="Dominant MegaCorp", email="mega@corp.com")
    c2 = Client(id=2, user_id=1, name="Minor Client", email="minor@client.com")
    db_session.add_all([user, c1, c2])

    # MegaCorp = $9,000 (90%), Minor = $1,000 (10%) across 3 payments
    p1 = Payment(id=1, user_id=1, invoice_id=1, client_id=1, transaction_id="T1", amount=Decimal("5000.00"), currency="USD", payment_date="2026-11-01", status="COMPLETED")
    p2 = Payment(id=2, user_id=1, invoice_id=2, client_id=1, transaction_id="T2", amount=Decimal("4000.00"), currency="USD", payment_date="2026-11-05", status="COMPLETED")
    p3 = Payment(id=3, user_id=1, invoice_id=3, client_id=2, transaction_id="T3", amount=Decimal("1000.00"), currency="USD", payment_date="2026-11-06", status="COMPLETED")
    db_session.add_all([p1, p2, p3])
    db_session.commit()

    res = detect_anomalies(user_id=1, db=db_session)
    conc_anomalies = [a for a in res["anomalies"] if a["code"] == "CRITICAL_REVENUE_CONCENTRATION"]
    assert len(conc_anomalies) == 1
    assert conc_anomalies[0]["metrics"]["concentration_percentage"] == 90.0
    assert conc_anomalies[0]["severity"] == "CRITICAL"


def test_detect_anomalies_severe_aging_overdue_invoices(db_session):
    """Detects invoices past due date and flags severe aging if overdue > 30 days."""
    user = User(id=1, email="biz@user.com", hashed_password="pw", full_name="Biz")
    client = Client(id=1, user_id=1, name="Slow Debtor", email="slow@debtor.com")
    db_session.add_all([user, client])

    today = datetime.now(timezone.utc).date()
    due_45_days_ago = today - timedelta(days=45)

    inv = Invoice(
        id=1,
        user_id=1,
        client_id=1,
        invoice_number="INV-OLD-01",
        issue_date=(due_45_days_ago - timedelta(days=14)).isoformat(),
        due_date=due_45_days_ago.isoformat(),
        total_amount=Decimal("3500.00"),
        status="OVERDUE",
    )
    db_session.add(inv)
    db_session.commit()

    res = detect_anomalies(user_id=1, db=db_session)
    aging = [a for a in res["anomalies"] if a["code"] == "SEVERE_AGING_RECEIVABLES"]
    assert len(aging) == 1
    assert aging[0]["severity"] == "CRITICAL"
    assert aging[0]["metrics"]["severe_overdue_count"] == 1
    assert aging[0]["metrics"]["invoices"][0]["days_overdue"] == 45

