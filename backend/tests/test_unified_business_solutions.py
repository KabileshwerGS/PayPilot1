import sys
import os
import time
from decimal import Decimal

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_all_four_business_solutions():
    print("\n=======================================================")
    print("STARTING PAYPILOT UNIFIED BUSINESS SOLUTIONS VERIFICATION")
    print("=======================================================")
    
    # -------------------------------------------------------------
    # 0. AUTHENTICATION & SETUP
    # -------------------------------------------------------------
    timestamp = int(time.time())
    email = f"operator_{timestamp}@paypilot.io"
    password = "SuperSecurePassword2026!"
    
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Jordan Business Operator",
        "email": email,
        "password": password
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Business Profile
    biz_res = client.post("/api/business", headers=headers, json={
        "business_name": "Apex Unified Commerce",
        "business_type": "Multi-Model Enterprise",
        "owner_name": "Jordan Operator",
        "email": email,
        "phone": "+1 555-0100",
        "country": "United States",
        "address": "500 Market Plaza, Suite 400",
        "default_currency": "USD",
        "time_zone": "America/New_York"
    })
    assert biz_res.status_code == 200, f"Business profile creation failed: {biz_res.text}"
    print("✓ Business Profile Created: Apex Unified Commerce")

    # -------------------------------------------------------------
    # USE CASE 1: FREELANCERS (Multi-Currency Invoicing & PayPal Settle)
    # -------------------------------------------------------------
    print("\n--- [Use Case 1] Freelancers: Multi-Currency Invoicing ---")
    # Add Client
    client_res = client.post("/api/clients", headers=headers, json={
        "name": "Acme Global Solutions",
        "email": f"billing_{timestamp}@acmeglobal.com",
        "company": "Acme Global Ltd",
        "country": "United Kingdom",
        "preferred_currency": "GBP",
        "notes": "Net 14 settlement terms"
    })
    assert client_res.status_code == 200, f"Client creation failed: {client_res.text}"
    client_id = client_res.json()["id"]

    # Create Multi-Currency Invoice (GBP 500)
    inv_res = client.post("/api/invoices", headers=headers, json={
        "client_id": client_id,
        "currency": "GBP",
        "issue_date": "2026-11-01",
        "due_date": "2026-11-15",
        "tax_rate": 20.0,
        "discount_amount": 0.0,
        "notes": "Full-stack payment orchestration consulting",
        "items": [
            {
                "description": "Multi-Tenant Architecture Review",
                "quantity": 5.0,
                "unit_price": 100.0
            }
        ],
        "approve_immediately": True
    })
    assert inv_res.status_code == 200, f"Invoice creation failed: {inv_res.text}"
    inv_data = inv_res.json()
    inv_id = inv_data["id"]
    inv_number = inv_data["invoice_number"]
    assert float(inv_data["total_amount"]) == 600.0  # 500 subtotal + 20% tax (100) = 600
    print(f"  ✓ Multi-Currency Invoice Generated: {inv_number} (GBP 600.00)")

    # Test Public Invoice Endpoint
    pub_inv_res = client.get(f"/api/public/invoices/{inv_number}")
    assert pub_inv_res.status_code == 200
    assert pub_inv_res.json()["invoice_number"] == inv_number
    print("  ✓ Public Invoice Accessible without authentication")

    # Settle Invoice via PayPal
    pp_order_res = client.post(f"/api/payments/paypal/create-order/{inv_id}")
    assert pp_order_res.status_code == 200
    pp_order_id = pp_order_res.json()["order_id"]

    pp_capture_res = client.post(f"/api/payments/paypal/capture/{pp_order_id}", json={
        "invoice_id": inv_id
    })
    assert pp_capture_res.status_code == 200
    assert pp_capture_res.json()["status"] == "COMPLETED"
    print("  ✓ Invoice Payment Settled via PayPal Integration")

    # -------------------------------------------------------------
    # USE CASE 2: CREATORS (Fan Tipping & Recurring Memberships)
    # -------------------------------------------------------------
    print("\n--- [Use Case 2] Creators: Fan Tipping & Memberships ---")
    creator_handle = f"creator_{timestamp}"
    creator_res = client.post("/api/creators/profile", headers=headers, json={
        "handle": creator_handle,
        "display_name": "Jordan Codes",
        "bio": "Building developer tools and payment infrastructure.",
        "suggested_tips": "[5, 10, 25, 50]",
        "currency": "USD"
    })
    assert creator_res.status_code == 201, f"Creator profile failed: {creator_res.text}"
    print(f"  ✓ Creator Profile Created: @{creator_handle}")

    # Add Recurring Membership Plan
    plan_res = client.post("/api/creators/plans", headers=headers, json={
        "name": "VIP Insider Tier",
        "description": "Weekly private engineering livestreams & direct Q&A.",
        "price": 25.00,
        "currency": "USD",
        "billing_interval": "MONTHLY",
        "perks": "Private Discord role, Early source code access"
    })
    assert plan_res.status_code == 201, f"Plan creation failed: {plan_res.text}"
    print("  ✓ Recurring Membership Plan Created: VIP Insider ($25/mo)")

    # Public Fan Tipping
    pub_creator_res = client.get(f"/api/public/creators/{creator_handle}")
    assert pub_creator_res.status_code == 200
    assert pub_creator_res.json()["handle"] == creator_handle

    # Fan sends a $50 tip
    tip_order_res = client.post(f"/api/public/creators/{creator_handle}/tip/create-order", json={
        "amount": 50.00,
        "supporter_name": "Dev Supporter",
        "message": "Loved the live demo!"
    })
    assert tip_order_res.status_code == 200
    tip_order_id = tip_order_res.json()["order_id"]

    tip_capture_res = client.post(f"/api/public/creators/{creator_handle}/tip/capture", json={
        "order_id": tip_order_id
    })
    assert tip_capture_res.status_code == 200
    assert tip_capture_res.json()["status"] == "COMPLETED"
    print("  ✓ Fan Tip Collected & Verified: $50.00 from Dev Supporter")

    # -------------------------------------------------------------
    # USE CASE 3: MARKETPLACES (Onboarding, Split Payments & Payouts)
    # -------------------------------------------------------------
    print("\n--- [Use Case 3] Marketplaces: Onboarding & Automated Split Checkout ---")
    # Onboard Sub-Merchant / Seller
    vendor_res = client.post("/api/marketplace/vendors", headers=headers, json={
        "vendor_name": "Elena Rostova",
        "store_name": "Artisan Leather & Crafts",
        "contact_email": f"elena_{timestamp}@crafts.com",
        "paypal_email": f"elena.payout_{timestamp}@crafts.com",
        "commission_rate_pct": 10.0,  # 10% Platform, 90% Vendor
    })
    assert vendor_res.status_code == 201, f"Vendor onboarding failed: {vendor_res.text}"
    vendor_id = vendor_res.json()["id"]
    print("  ✓ Sub-Merchant Onboarded: Artisan Leather (10% platform commission cut)")

    # Add Vendor Product
    prod_res = client.post("/api/marketplace/products", headers=headers, json={
        "vendor_id": vendor_id,
        "name": "Full-Grain Leather Messenger Bag",
        "description": "Hand-stitched vegetable-tanned leather briefcase.",
        "price": 200.00,
        "currency": "USD"
    })
    assert prod_res.status_code == 201, f"Vendor product failed: {prod_res.text}"
    product_id = prod_res.json()["id"]
    print("  ✓ Marketplace Product Listed: $200.00 Leather Messenger Bag")

    # Public Multi-Vendor Store Checkout (Automatic Split Payment)
    mkt_checkout_res = client.post("/api/public/marketplace/checkout", json={
        "buyer_name": "Alex Buyer",
        "buyer_email": "alex.buyer@example.com",
        "items": [
            {
                "product_id": product_id,
                "quantity": 1
            }
        ]
    })
    assert mkt_checkout_res.status_code == 200, f"Marketplace checkout failed: {mkt_checkout_res.text}"
    order_data = mkt_checkout_res.json()
    assert float(order_data["total_amount"]) == 200.00
    assert float(order_data["platform_commission"]) == 20.00  # 10% of 200 = 20.00
    assert float(order_data["vendor_share"]) == 180.00       # 90% of 200 = 180.00
    print(f"  ✓ Split Checkout Executed: Gross $200.00 -> Platform Commission: $20.00 | Vendor Net: $180.00")

    # Export PayPal Mass Payouts Batch CSV
    csv_res = client.get("/api/marketplace/payouts/export-paypal-csv", headers=headers)
    assert csv_res.status_code == 200
    assert "elena.payout" in csv_res.text
    assert "180.00" in csv_res.text
    print("  ✓ PayPal Mass Payouts CSV Batch Exported for compliant vendor disbursal")

    # -------------------------------------------------------------
    # USE CASE 4: SMALL MERCHANTS (Point-of-Sale, SKU Inventory & Dynamic QR)
    # -------------------------------------------------------------
    print("\n--- [Use Case 4] Small Merchants: POS Register & Dynamic QR ---")
    # Add SKU to Store Inventory
    pos_prod_res = client.post("/api/pos/products", headers=headers, json={
        "name": "Artisan Cold Brew Coffee",
        "sku": f"CB-{timestamp}",
        "barcode": f"890123{timestamp % 100000}",
        "category": "Beverages",
        "price": 5.00,
        "cost_price": 1.50,
        "stock_quantity": 40
    })
    assert pos_prod_res.status_code == 201, f"POS product failed: {pos_prod_res.text}"
    pos_prod_id = pos_prod_res.json()["id"]
    print("  ✓ Retail SKU Created: Artisan Cold Brew ($5.00, Stock: 40)")

    # Execute Cash Tender Checkout ($20 cash for 2 cold brews = $10.00, Change = $10.00)
    cash_checkout_res = client.post("/api/pos/checkout", headers=headers, json={
        "items": [{"product_id": pos_prod_id, "name": "Artisan Cold Brew Coffee", "sku": f"CB-{timestamp}", "price": 5.00, "quantity": 2}],
        "payment_method": "CASH",
        "cash_tendered": 20.00
    })
    assert cash_checkout_res.status_code == 200, f"Cash checkout failed: {cash_checkout_res.text}"
    cash_order = cash_checkout_res.json()
    assert float(cash_order["total_amount"]) == 10.00
    assert float(cash_order["change_due"]) == 10.00
    print("  ✓ Cash Checkout Completed: Total $10.00, Tendered $20.00, Change Given $10.00")

    # Execute Dynamic PayPal QR Checkout
    qr_checkout_res = client.post("/api/pos/checkout", headers=headers, json={
        "items": [{"product_id": pos_prod_id, "name": "Artisan Cold Brew Coffee", "sku": f"CB-{timestamp}", "price": 5.00, "quantity": 1}],
        "payment_method": "PAYPAL_QR"
    })
    assert qr_checkout_res.status_code == 200, f"QR checkout failed: {qr_checkout_res.text}"
    qr_order = qr_checkout_res.json()
    qr_order_number = qr_order["order_number"]
    assert qr_order["payment_status"] == "PENDING"
    print(f"  ✓ Dynamic PayPal QR Generated for Order: {qr_order_number}")

    # Mobile customer scans and pays via PayPal
    qr_pay_res = client.post(f"/api/public/pos/orders/{qr_order_number}/pay-paypal")
    assert qr_pay_res.status_code == 200
    qr_pp_order_id = qr_pay_res.json()["paypal_order_id"]

    qr_cap_res = client.post(f"/api/public/pos/orders/{qr_order_number}/capture-paypal", json={
        "paypal_order_id": qr_pp_order_id
    })
    assert qr_cap_res.status_code == 200
    assert qr_cap_res.json()["status"] == "COMPLETED"
    print("  ✓ Customer Mobile QR Scan & PayPal Settle: Order COMPLETED")

    # -------------------------------------------------------------
    # 5. CONSOLIDATED 4-STREAM REVENUE ANALYTICS
    # -------------------------------------------------------------
    print("\n--- [Consolidated Engine] Unified 4-Stream Revenue Analytics ---")
    reports_res = client.get("/api/analytics/reports", headers=headers)
    assert reports_res.status_code == 200
    reports = reports_res.json()
    
    fl_rev = float(reports.get('freelance_revenue') or 0)
    cr_rev = float(reports.get('creator_tips_revenue') or 0)
    mk_rev = float(reports.get('marketplace_commissions') or 0)
    pos_rev = float(reports.get('pos_retail_revenue') or 0)
    tot_rev = float(reports.get('total_revenue') or 0)
    net_prof = float(reports.get('net_profit') or 0)
    margin = float(reports.get('profit_margin_pct') or 0)

    print(f"  • Freelance Invoicing Revenue:  ${fl_rev:.2f}")
    print(f"  • Creator Tips & Memberships:   ${cr_rev:.2f}")
    print(f"  • Marketplace Platform Cuts:    ${mk_rev:.2f}")
    print(f"  • POS Retail In-Store Revenue:  ${pos_rev:.2f}")
    print(f"  -------------------------------------------------")
    print(f"  • Combined Platform GMV:        ${tot_rev:.2f}")
    print(f"  • Net Operating Profit:         ${net_prof:.2f}")
    print(f"  • Operating Margin:             {margin:.1f}%")

    assert fl_rev > 0
    assert cr_rev >= 50.0
    assert mk_rev >= 20.0
    assert pos_rev >= 15.0  # 10 cash + 5 QR
    assert tot_rev > 0

    print("\n=======================================================")
    print("ALL 4 BUSINESS SOLUTIONS VERIFIED & FULLY FUNCTIONAL!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_all_four_business_solutions()
