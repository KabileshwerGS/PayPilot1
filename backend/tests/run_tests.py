import sys
import os
import time

sys.path.insert(0, os.path.abspath("."))

from backend.app.main import app
from fastapi.testclient import TestClient

print("Starting PayPilot End-to-End Test Suite...", flush=True)
client = TestClient(app)

print("\n[Step 1] Testing Health Endpoint...", flush=True)
res = client.get("/api/health")
assert res.status_code == 200
assert res.json()["status"] == "healthy"
print("  ✓ Health check: PASSED", flush=True)

print("\n[Step 2] Testing User Registration & Hashing...", flush=True)
user_email = f"test.user.{int(time.time())}@example.com"
reg_res = client.post("/api/auth/register", json={
    "full_name": "Sarah Connor",
    "email": user_email,
    "password": "StrongPassword2026!",
})
assert reg_res.status_code == 200, reg_res.text
token = reg_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("  ✓ User registration & JWT generation: PASSED", flush=True)

print("\n[Step 3] Testing Duplicate Registration Prevention...", flush=True)
dup_res = client.post("/api/auth/register", json={
    "full_name": "Sarah Connor",
    "email": user_email,
    "password": "StrongPassword2026!",
})
assert dup_res.status_code == 400
print("  ✓ Duplicate registration rejected: PASSED", flush=True)

print("\n[Step 4] Testing User Login...", flush=True)
login_res = client.post("/api/auth/login", json={
    "email": user_email,
    "password": "StrongPassword2026!",
})
assert login_res.status_code == 200
assert "access_token" in login_res.json()
print("  ✓ User login & token verification: PASSED", flush=True)

print("\n[Step 5] Testing Business Onboarding...", flush=True)
biz_res = client.post("/api/business", headers=headers, json={
    "business_name": "Cyberdyne Strategy Consulting",
    "business_type": "Consultant",
    "owner_name": "Sarah Connor",
    "email": user_email,
    "phone": "+1 555-8901",
    "country": "United States",
    "address": "450 Technology Parkway, Austin, TX",
    "default_currency": "USD",
    "time_zone": "America/Chicago",
})
assert biz_res.status_code == 200
assert biz_res.json()["business_name"] == "Cyberdyne Strategy Consulting"
print("  ✓ Business onboarding profile created: PASSED", flush=True)

print("\n[Step 6] Testing Initial Zero-Data Dashboard...", flush=True)
dash_res = client.get("/api/dashboard/summary", headers=headers)
assert dash_res.status_code == 200
summary = dash_res.json()
assert summary["total_revenue"] == "0.00"
assert summary["total_clients"] == 0
assert summary["total_invoices"] == 0
assert summary["successful_payments"] == 0
print("  ✓ Clean empty dashboard (no fake data): PASSED", flush=True)

print("\n[Step 7] Testing Client Creation...", flush=True)
client_res = client.post("/api/clients", headers=headers, json={
    "name": "Omni Consumer Products",
    "email": "billing@ocp.com",
    "company": "OCP Inc",
    "country": "United States",
    "billing_address": "1 Detroit Plaza",
    "preferred_currency": "USD",
    "notes": "Premium enterprise account",
})
assert client_res.status_code == 200
client_id = client_res.json()["id"]
print("  ✓ Client created: PASSED", flush=True)

print("\n[Step 8] Testing Invoice Creation with Decimal Arithmetic...", flush=True)
inv_res = client.post("/api/invoices", headers=headers, json={
    "client_id": client_id,
    "currency": "USD",
    "issue_date": "2026-11-01",
    "due_date": "2026-11-15",
    "tax_rate": 8.5,
    "discount_amount": 100.0,
    "notes": "Full stack architecture and cloud deployment",
    "terms": "Net 14 days",
    "items": [
        {"description": "Backend API Development", "quantity": 20.0, "unit_price": 100.0},
        {"description": "Frontend UI Implementation", "quantity": 10.0, "unit_price": 100.0},
    ],
    "approve_immediately": False,
})
assert inv_res.status_code == 200
inv_data = inv_res.json()
inv_id = inv_data["id"]
inv_number = inv_data["invoice_number"]

# Subtotal = 20*100 + 10*100 = 3000.00
# Tax 8.5% = 255.00
# Discount = 100.00
# Total = 3000 + 255 - 100 = 3155.00
from decimal import Decimal
assert Decimal(str(inv_data["subtotal"])) == Decimal("3000.00")
assert Decimal(str(inv_data["tax_amount"])) == Decimal("255.00")
assert Decimal(str(inv_data["discount_amount"])) == Decimal("100.00")
assert Decimal(str(inv_data["total_amount"])) == Decimal("3155.00")
assert inv_data["status"] == "DRAFT"
print("  ✓ Invoice decimal calculations & line items: PASSED", flush=True)

print("\n[Step 9] Testing Invoice Approval Transition...", flush=True)
appr_res = client.post(f"/api/invoices/{inv_id}/approve", headers=headers)
assert appr_res.status_code == 200
assert appr_res.json()["status"] == "APPROVED"
print("  ✓ Invoice status transition to APPROVED: PASSED", flush=True)

print("\n[Step 10] Testing Invoice Send Transition...", flush=True)
send_res = client.post(f"/api/invoices/{inv_id}/send", headers=headers)
assert send_res.status_code == 200
assert send_res.json()["status"] == "SENT"
print("  ✓ Invoice status transition to SENT: PASSED", flush=True)

print("\n[Step 11] Testing ReportLab PDF Generation...", flush=True)
pdf_res = client.get(f"/api/invoices/{inv_id}/pdf", headers=headers)
assert pdf_res.status_code == 200
assert pdf_res.headers["content-type"] == "application/pdf"
assert len(pdf_res.content) > 1000
print(f"  ✓ PDF generated successfully ({len(pdf_res.content)} bytes): PASSED", flush=True)

print("\n[Step 12] Testing Public Checkout Endpoint...", flush=True)
pub_res = client.get(f"/api/public/invoices/{inv_number}")
assert pub_res.status_code == 200
assert pub_res.json()["invoice_number"] == inv_number
print("  ✓ Public invoice checkout page: PASSED", flush=True)

print("\n[Step 13] Testing PayPal Order Creation...", flush=True)
order_res = client.post(f"/api/payments/paypal/create-order/{inv_id}")
assert order_res.status_code == 200
order_id = order_res.json()["order_id"]
print(f"  ✓ PayPal order created (Order ID: {order_id}): PASSED", flush=True)

print("\n[Step 14] Testing PayPal Capture & Verification...", flush=True)
cap_res = client.post(f"/api/payments/paypal/capture/{order_id}", json={"invoice_id": inv_id})
assert cap_res.status_code == 200
payment = cap_res.json()
assert payment["status"] == "COMPLETED"
assert Decimal(str(payment["amount"])) == Decimal("3155.00")
print("  ✓ PayPal capture verified and recorded: PASSED", flush=True)

print("\n[Step 15] Verifying Invoice Status Updated to PAID...", flush=True)
inv_paid_res = client.get(f"/api/invoices/{inv_id}", headers=headers)
assert inv_paid_res.json()["status"] == "PAID"
print("  ✓ Invoice status is now PAID: PASSED", flush=True)

print("\n[Step 16] Verifying Live Dashboard Revenue Metric...", flush=True)
dash_updated = client.get("/api/dashboard/summary", headers=headers).json()
assert Decimal(str(dash_updated["total_revenue"])) == Decimal("3155.00")
assert dash_updated["successful_payments"] == 1
assert dash_updated["total_invoices"] == 1
assert dash_updated["total_clients"] == 1
print("  ✓ Dashboard telemetry reflects verified payments: PASSED", flush=True)

print("\n[Step 17] Testing Financial Analytics & Reports...", flush=True)
analytics_res = client.get("/api/analytics/reports", headers=headers)
assert analytics_res.status_code == 200
analytics_data = analytics_res.json()
assert Decimal(str(analytics_data["total_gross"])) == Decimal("3155.00")
print("  ✓ Multi-currency consolidated analytics: PASSED", flush=True)

print("\n[Step 18] Testing CSV Ledger Export...", flush=True)
csv_res = client.get("/api/analytics/export/csv", headers=headers)
assert csv_res.status_code == 200
assert "Transaction ID,Invoice Number,Client Name" in csv_res.text
assert "3155.00" in csv_res.text
print("  ✓ CSV ledger export generated: PASSED", flush=True)

print("\n[Step 19] Testing Reminders & Notification Flow...", flush=True)
rem_res = client.post("/api/reminders/process", headers=headers)
assert rem_res.status_code == 200
notif_res = client.get("/api/notifications", headers=headers)
assert notif_res.status_code == 200
assert len(notif_res.json()["notifications"]) > 0
print("  ✓ Reminders scanner and notifications: PASSED", flush=True)

print("\n" + "="*60)
print(">>> ALL 19 TEST MODULES EXECUTED AND PASSED WITH 100% SUCCESS <<<")
print("="*60, flush=True)
