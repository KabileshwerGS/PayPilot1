import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_full_business_lifecycle():
    # 1. Register new user
    user_email = "alex.consulting@example.com"
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Alex Mercer",
        "email": user_email,
        "password": "SecurePassword123!",
    })
    assert reg_res.status_code == 200, reg_res.text
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Duplicate registration should be rejected
    dup_res = client.post("/api/auth/register", json={
        "full_name": "Alex Mercer",
        "email": user_email,
        "password": "AnotherPassword456!",
    })
    assert dup_res.status_code == 400

    # 3. Login
    login_res = client.post("/api/auth/login", json={
        "email": user_email,
        "password": "SecurePassword123!",
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # 4. Create Business Profile (Onboarding)
    biz_res = client.post("/api/business", headers=headers, json={
        "business_name": "Mercer Strategy Group",
        "business_type": "Agency",
        "owner_name": "Alex Mercer",
        "email": user_email,
        "phone": "+1 555-0199",
        "country": "United States",
        "address": "100 Financial Way, New York, NY",
        "default_currency": "USD",
        "time_zone": "America/New_York",
    })
    assert biz_res.status_code == 200
    assert biz_res.json()["business_name"] == "Mercer Strategy Group"

    # 5. Check Initial Empty Dashboard (No fake data!)
    dash_res = client.get("/api/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    summary = dash_res.json()
    assert summary["total_revenue"] == "0.00"
    assert summary["total_clients"] == 0
    assert summary["total_invoices"] == 0
    assert summary["successful_payments"] == 0

    # 6. Add Client
    client_res = client.post("/api/clients", headers=headers, json={
        "name": "Global Tech Corp",
        "email": "ap@globaltech.com",
        "company": "Global Tech",
        "country": "Germany",
        "billing_address": "Friedrichstrasse 12, Berlin",
        "preferred_currency": "EUR",
        "notes": "Net 14 payment terms",
    })
    assert client_res.status_code == 200
    client_id = client_res.json()["id"]

    # 7. Create Invoice (EUR 1,200 total)
    inv_res = client.post("/api/invoices", headers=headers, json={
        "client_id": client_id,
        "currency": "EUR",
        "issue_date": "2026-11-01",
        "due_date": "2026-11-15",
        "tax_rate": 10.0,
        "discount_amount": 50.0,
        "notes": "Consulting services for Q4 architecture review",
        "terms": "Net 14 days",
        "items": [
            {
                "description": "Strategic Architecture Consultation",
                "quantity": 10.0,
                "unit_price": 100.0,  # 10 * 100 = 1000
            },
            {
                "description": "Security Audit Report",
                "quantity": 1.0,
                "unit_price": 250.0,  # 250 -> subtotal = 1250
            }
        ],
        "approve_immediately": False,
    })
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    inv_id = inv_data["id"]
    inv_number = inv_data["invoice_number"]

    # Verify decimal calculations:
    # Subtotal = 1250.00
    # Tax 10% = 125.00
    # Discount = 50.00
    # Total = 1250 + 125 - 50 = 1325.00
    assert Decimal(str(inv_data["subtotal"])) == Decimal("1250.00")
    assert Decimal(str(inv_data["tax_amount"])) == Decimal("125.00")
    assert Decimal(str(inv_data["discount_amount"])) == Decimal("50.00")
    assert Decimal(str(inv_data["total_amount"])) == Decimal("1325.00")
    assert inv_data["status"] == "DRAFT"

    # 8. Approve Invoice
    appr_res = client.post(f"/api/invoices/{inv_id}/approve", headers=headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # 9. Send Invoice
    send_res = client.post(f"/api/invoices/{inv_id}/send", headers=headers)
    assert send_res.status_code == 200
    assert send_res.json()["status"] == "SENT"

    # 10. Download PDF
    pdf_res = client.get(f"/api/invoices/{inv_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # 11. Public Invoice Endpoint
    pub_res = client.get(f"/api/public/invoices/{inv_number}")
    assert pub_res.status_code == 200
    assert pub_res.json()["invoice_number"] == inv_number

    # 12. Create PayPal Order
    order_res = client.post(f"/api/payments/paypal/create-order/{inv_id}")
    assert order_res.status_code == 200
    order_id = order_res.json()["order_id"]

    # 13. Capture PayPal Order
    cap_res = client.post(f"/api/payments/paypal/capture/{order_id}", json={"invoice_id": inv_id})
    assert cap_res.status_code == 200
    payment_record = cap_res.json()
    assert payment_record["status"] == "COMPLETED"
    assert Decimal(str(payment_record["amount"])) == Decimal("1325.00")

    # 14. Verify Invoice Transition to PAID
    inv_paid_res = client.get(f"/api/invoices/{inv_id}", headers=headers)
    assert inv_paid_res.json()["status"] == "PAID"

    # 15. Verify Dashboard Reflects Verified Payment
    dash_updated = client.get("/api/dashboard/summary", headers=headers).json()
    assert Decimal(str(dash_updated["total_revenue"])) == Decimal("1325.00")
    assert dash_updated["successful_payments"] == 1
    assert dash_updated["total_invoices"] == 1
    assert dash_updated["total_clients"] == 1

    # 16. Multi-Currency Analytics
    analytics_res = client.get("/api/analytics/reports", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert len(analytics_data["currency_breakdown"]) >= 1
    eur_item = next(item for item in analytics_data["currency_breakdown"] if item["currency"] == "EUR")
    assert Decimal(str(eur_item["original_amount"])) == Decimal("1325.00")

    # 17. CSV Export
    csv_res = client.get("/api/analytics/export/csv", headers=headers)
    assert csv_res.status_code == 200
    assert "Transaction ID,Invoice Number,Client Name" in csv_res.text

    # 18. Reminder Processing
    remind_res = client.post("/api/reminders/process", headers=headers)
    assert remind_res.status_code == 200

    # 19. Notifications list
    notif_res = client.get("/api/notifications", headers=headers)
    assert notif_res.status_code == 200
    assert len(notif_res.json()["notifications"]) > 0

    print("\n>>> ALL 19 END-TO-END TEST SUITE ASSERTIONS PASSED PERFECTLY! <<<")

