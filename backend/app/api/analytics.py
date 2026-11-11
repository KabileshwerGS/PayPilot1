import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from decimal import Decimal

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.invoices import Invoice
from backend.app.models.clients import Client
from backend.app.models.payments import Payment
from backend.app.models.payouts import Payout
from backend.app.models.creators import CreatorProfile, Tip
from backend.app.models.marketplace import MarketplaceOrder
from backend.app.models.pos import POSOrder
from backend.app.schemas.analytics import (
    AnalyticsReportResponse,
    CurrencyBreakdownItem,
    ClientRevenueItem,
)
from backend.app.services.exchange_rate_service import get_exchange_rate

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/reports", response_model=AnalyticsReportResponse)
async def get_analytics_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    default_currency = business.default_currency if business else "USD"

    # Verified payments
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.status == "COMPLETED",
    ).all()

    # Unpaid invoices
    unpaid_invoices = db.query(Invoice).filter(
        Invoice.user_id == current_user.id,
        Invoice.status.in_(["APPROVED", "SENT", "OVERDUE"]),
    ).all()

    # Multi-currency group
    currency_totals = {}
    for p in payments:
        currency_totals[p.currency] = currency_totals.get(p.currency, Decimal("0.0")) + p.amount

    currency_breakdown = []
    total_gross = Decimal("0.0")

    for cur, orig_amount in currency_totals.items():
        rate = await get_exchange_rate(cur, default_currency, db)
        converted = orig_amount * Decimal(str(rate))
        total_gross += converted
        currency_breakdown.append(
            CurrencyBreakdownItem(
                currency=cur,
                original_amount=orig_amount,
                rate=rate,
                converted_amount=converted,
            )
        )

    # Outstanding sum in default currency
    total_outstanding = Decimal("0.0")
    for inv in unpaid_invoices:
        rate = await get_exchange_rate(inv.currency, default_currency, db)
        total_outstanding += inv.total_amount * Decimal(str(rate))

    # Revenue by Client
    client_totals = {}
    client_counts = {}
    for p in payments:
        client_totals[p.client_id] = client_totals.get(p.client_id, Decimal("0.0")) + p.amount
        client_counts[p.client_id] = client_counts.get(p.client_id, 0) + 1

    client_revenue = []
    for cid, amt in client_totals.items():
        client = db.query(Client).filter(Client.id == cid).first()
        client_revenue.append(
            ClientRevenueItem(
                client_name=client.name if client else f"Client #{cid}",
                invoices_paid=client_counts.get(cid, 0),
                total_amount=amt,
            )
        )

    # Calculate employee payouts (labor expenses)
    paid_payouts = db.query(Payout).filter(
        Payout.user_id == current_user.id,
        Payout.status == "PAID",
    ).all()
    pending_payouts = db.query(Payout).filter(
        Payout.user_id == current_user.id,
        Payout.status.in_(["PENDING", "APPROVED"]),
    ).all()

    total_payouts_paid = Decimal("0.0")
    for po in paid_payouts:
        rate = await get_exchange_rate(po.currency, default_currency, db)
        total_payouts_paid += po.amount * Decimal(str(rate))

    total_payouts_pending = Decimal("0.0")
    for po in pending_payouts:
        rate = await get_exchange_rate(po.currency, default_currency, db)
        total_payouts_pending += po.amount * Decimal(str(rate))

    # Multi-solution revenue breakdown
    freelance_rev = total_gross

    # 2. Creator Tips
    creator = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    creator_tips_rev = Decimal("0.0")
    if creator:
        tips = db.query(Tip).filter(Tip.creator_id == creator.id, Tip.status == "COMPLETED").all()
        for t in tips:
            rate = await get_exchange_rate(t.currency, default_currency, db)
            creator_tips_rev += t.amount * Decimal(str(rate))

    # 3. Marketplace Commissions
    mkt_orders = db.query(MarketplaceOrder).filter(
        MarketplaceOrder.user_id == current_user.id,
        MarketplaceOrder.payment_status == "COMPLETED",
    ).all()
    mkt_comm_rev = Decimal("0.0")
    for mo in mkt_orders:
        rate = await get_exchange_rate(mo.currency, default_currency, db)
        mkt_comm_rev += mo.platform_commission * Decimal(str(rate))

    # 4. Small Merchant POS Retail
    pos_orders = db.query(POSOrder).filter(
        POSOrder.user_id == current_user.id,
        POSOrder.payment_status == "COMPLETED",
    ).all()
    pos_rev = Decimal("0.0")
    for po in pos_orders:
        rate = await get_exchange_rate(po.currency, default_currency, db)
        pos_rev += po.total_amount * Decimal(str(rate))

    combined_revenue = freelance_rev + creator_tips_rev + mkt_comm_rev + pos_rev
    net_profit = combined_revenue - total_payouts_paid
    profit_margin_pct = float((net_profit / combined_revenue) * 100) if combined_revenue > 0 else 0.0

    return AnalyticsReportResponse(
        total_gross=combined_revenue,
        total_outstanding=total_outstanding,
        total_revenue=combined_revenue,
        freelance_revenue=freelance_rev,
        creator_tips_revenue=creator_tips_rev,
        marketplace_commissions=mkt_comm_rev,
        pos_retail_revenue=pos_rev,
        total_payouts_paid=total_payouts_paid,
        total_payouts_pending=total_payouts_pending,
        net_profit=net_profit,
        profit_margin_pct=round(profit_margin_pct, 2),
        currency_breakdown=currency_breakdown,
        client_revenue=client_revenue,
    )

@router.get("/export/csv")
def export_csv_ledger(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.status == "COMPLETED",
    ).order_by(Payment.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID",
        "Invoice Number",
        "Client Name",
        "Payment Date",
        "Amount",
        "Currency",
        "Provider",
        "Status",
    ])

    for p in payments:
        inv = db.query(Invoice).filter(Invoice.id == p.invoice_id).first()
        client = db.query(Client).filter(Client.id == p.client_id).first()
        writer.writerow([
            p.transaction_id,
            inv.invoice_number if inv else "",
            client.name if client else "",
            p.payment_date,
            f"{p.amount:.2f}",
            p.currency,
            p.provider,
            p.status,
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=PayPilot_Ledger.csv"},
    )

