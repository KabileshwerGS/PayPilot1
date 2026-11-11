import pytest
from fastapi.testclient import TestClient
from decimal import Decimal

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.clients import Client
from backend.app.models.staff import Staff
from backend.app.models.services import Service
from backend.app.models.jobs import Job
from backend.app.models.payouts import Payout

client = TestClient(app)

def test_full_small_business_operations_workflow():
    # 1. Register test user
    email = f"cleaner_agency_{id(app)}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Elena Vance",
        "email": email,
        "password": "Password123!",
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Setup Business Profile
    biz_res = client.post("/api/business", json={
        "business_name": "Sparkle Pro Cleaners",
        "business_type": "Agency",
        "owner_name": "Elena Vance",
        "email": email,
        "phone": "+1-555-0199",
        "country": "United States",
        "address": "100 Sparkle Way, Austin TX",
        "default_currency": "USD",
        "time_zone": "America/Chicago",
    }, headers=headers)
    assert biz_res.status_code == 200

    # 3. Create Staff / Cleaners with different pay terms
    # Staff 1: Hourly cleaner ($25/hr)
    staff1_res = client.post("/api/staff", json={
        "name": "Maria Rodriguez",
        "email": "maria@sparklepro.com",
        "phone": "+1-555-1122",
        "role": "Lead Cleaner",
        "employment_type": "FULL_TIME",
        "payment_terms": "HOURLY",
        "hourly_rate": 25.0,
        "status": "ACTIVE",
        "notes": "Residential specialist",
    }, headers=headers)
    assert staff1_res.status_code == 201
    staff1 = staff1_res.json()
    assert staff1["name"] == "Maria Rodriguez"
    assert float(staff1["hourly_rate"]) == 25.0

    # Staff 2: Fixed per job cleaner ($80/job)
    staff2_res = client.post("/api/staff", json={
        "name": "David Chen",
        "email": "david@sparklepro.com",
        "phone": "+1-555-3344",
        "role": "Specialist",
        "employment_type": "CONTRACTOR",
        "payment_terms": "FIXED_PER_JOB",
        "fixed_job_rate": 80.0,
        "status": "ACTIVE",
    }, headers=headers)
    assert staff2_res.status_code == 201
    staff2 = staff2_res.json()

    # 4. Create Services
    serv1_res = client.post("/api/services", json={
        "name": "Standard Deep Clean (2 Bedroom)",
        "category": "Residential",
        "description": "Full sanitization, kitchens, bathrooms, floors and dusting.",
        "price": 220.0,
        "currency": "USD",
        "estimated_duration_hours": 3.0,
        "pricing_type": "FLAT_RATE",
        "is_active": True,
    }, headers=headers)
    assert serv1_res.status_code == 201
    service1 = serv1_res.json()
    assert float(service1["price"]) == 220.0

    # 5. Create Client
    client_res = client.post("/api/clients", json={
        "name": "Sarah Connor",
        "email": "sarah.connor@example.com",
        "phone": "+1-555-8899",
        "company": "SkyNet Logistics",
        "country": "United States",
        "billing_address": "404 Cyberdyne Blvd, Austin TX",
        "preferred_currency": "USD",
    }, headers=headers)
    assert client_res.status_code == 201
    cust = client_res.json()

    # 6. Schedule a Job with assigned staff
    job_res = client.post("/api/jobs", json={
        "client_id": cust["id"],
        "service_id": service1["id"],
        "title": "Bi-weekly Home Deep Clean",
        "scheduled_date": "2026-11-15",
        "scheduled_start_time": "09:00",
        "scheduled_end_time": "12:00",
        "priority": "HIGH",
        "assigned_staff_ids": [staff1["id"], staff2["id"]],
        "notes": "Gate code #4411. Beware of friendly dog.",
    }, headers=headers)
    assert job_res.status_code == 201
    job = job_res.json()
    assert job["job_number"].startswith("JOB-")
    assert job["status"] == "ASSIGNED"
    assert len(job["assignments"]) == 2

    # 7. Start the Job
    start_res = client.post(f"/api/jobs/{job['id']}/start", headers=headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"
    assert start_res.json()["started_at"] is not None

    # 8. Complete the Job with actual hours
    comp_res = client.post(f"/api/jobs/{job['id']}/complete", json={
        "actual_hours": 3.5,
        "completion_notes": "Completed on time. All checklist items inspected and approved by client.",
        "checklist": "Kitchen sanitized, Bathrooms scrubbed, Floors steamed",
    }, headers=headers)
    assert comp_res.status_code == 200
    completed_job = comp_res.json()
    assert completed_job["status"] == "COMPLETED"
    assert float(completed_job["actual_hours"]) == 3.5

    # 9. Invoice Integration Bridge: Generate Invoice from Completed Job
    inv_res = client.post(f"/api/jobs/{job['id']}/create-invoice", json={
        "approve_immediately": True,
        "tax_rate": 8.25,
        "due_days": 7,
    }, headers=headers)
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert inv_data["invoice_number"].startswith("INV-")
    assert inv_data["status"] == "APPROVED"
    assert inv_data["invoice_id"] is not None

    # Verify duplicate prevention: calling again without force_duplicate must fail with 400
    dup_res = client.post(f"/api/jobs/{job['id']}/create-invoice", json={
        "force_duplicate": False,
    }, headers=headers)
    assert dup_res.status_code == 400
    assert "already been invoiced" in dup_res.json()["detail"]

    # 10. Employee Payout Calculation & Ledger
    # Calculate payout for Hourly staff (3.5 hours * $25 = $87.50)
    calc1_res = client.post("/api/payouts/calculate", json={
        "job_id": job["id"],
        "staff_id": staff1["id"],
    }, headers=headers)
    assert calc1_res.status_code == 200
    calc1 = calc1_res.json()
    assert float(calc1["calculated_amount"]) == 87.50
    assert calc1["payout_type"] == "HOURLY_WAGE"

    # Calculate payout for Fixed per job staff ($80.00)
    calc2_res = client.post("/api/payouts/calculate", json={
        "job_id": job["id"],
        "staff_id": staff2["id"],
    }, headers=headers)
    assert calc2_res.status_code == 200
    assert float(calc2_res.json()["calculated_amount"]) == 80.00

    # Create Payout record for Staff 1
    payout1_res = client.post("/api/payouts", json={
        "staff_id": staff1["id"],
        "job_id": job["id"],
        "amount": calc1["calculated_amount"],
        "currency": "USD",
        "payout_type": "HOURLY_WAGE",
        "payment_method": "BANK_TRANSFER",
        "notes": "Bi-weekly pay cycle for Deep Clean Job",
    }, headers=headers)
    assert payout1_res.status_code == 201
    payout1 = payout1_res.json()
    assert payout1["status"] == "PENDING"
    assert payout1["payout_reference"].startswith("PAYOUT-")

    # Approve Payout
    appr_res = client.post(f"/api/payouts/{payout1['id']}/approve", headers=headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # Mark as Paid
    paid_res = client.post(f"/api/payouts/{payout1['id']}/mark-paid", json={
        "payment_method": "BANK_TRANSFER",
        "notes": "ACH Transfer Ref #TXN998877",
    }, headers=headers)
    assert paid_res.status_code == 200
    assert paid_res.json()["status"] == "PAID"
    assert paid_res.json()["paid_at"] is not None

    # 11. Payout Summary
    summary_res = client.get("/api/payouts/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert float(summary["total_paid"]) == 87.50

    # 12. Financial Analytics (Net Profit = Revenue - Payouts)
    analytics_res = client.get("/api/analytics/reports", headers=headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert "total_payouts_paid" in analytics
    assert float(analytics["total_payouts_paid"]) == 87.50
    assert "net_profit" in analytics

