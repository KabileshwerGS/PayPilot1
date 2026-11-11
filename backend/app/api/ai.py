from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
import json

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice
from backend.app.models.payments import Payment
from backend.app.models.staff import Staff
from backend.app.models.services import Service
from backend.app.models.jobs import Job
from backend.app.models.payouts import Payout
from backend.app.models.creators import CreatorProfile, Tip, Subscription
from backend.app.models.marketplace import MarketplaceVendor, MarketplaceOrder
from backend.app.models.pos import Product, POSOrder
from backend.app.models.settings import IntegrationSettings
from backend.app.models.audit_logs import AuditLog
from backend.app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AIActionExecuteRequest,
    AIActionExecuteResponse,
)
from backend.app.integrations.gemini import GeminiClient

router = APIRouter(prefix="/ai", tags=["AI Pilot"])

def get_gemini_client(db: Session, user_id: int) -> GeminiClient:
    setting = db.query(IntegrationSettings).filter(
        IntegrationSettings.user_id == user_id,
        IntegrationSettings.provider == "GEMINI",
    ).first()
    if setting and setting.config_data:
        try:
            cfg = json.loads(setting.config_data)
            key = cfg.get("gemini_api_key")
            if key:
                return GeminiClient(api_key=key)
        except Exception:
            pass
    return GeminiClient()

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_ai(
    req: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Gather real, grounded business context
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    clients = db.query(Client).filter(Client.user_id == current_user.id, Client.is_archived == False).all()
    invoices = db.query(Invoice).filter(Invoice.user_id == current_user.id).all()
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).all()
    staff_members = db.query(Staff).filter(Staff.user_id == current_user.id).all()
    jobs = db.query(Job).filter(Job.user_id == current_user.id).all()
    payouts = db.query(Payout).filter(Payout.user_id == current_user.id).all()

    total_revenue = sum([p.amount for p in payments if p.status == "COMPLETED"]) or Decimal("0.0")
    total_payouts_paid = sum([po.amount for po in payouts if po.status == "PAID"]) or Decimal("0.0")
    total_payouts_pending = sum([po.amount for po in payouts if po.status in ["PENDING", "APPROVED"]]) or Decimal("0.0")

    overdue_invoices = [inv for inv in invoices if inv.status == "OVERDUE"]
    pending_invoices = [inv for inv in invoices if inv.status in ["APPROVED", "SENT"]]
    completed_jobs = [j for j in jobs if j.status == "COMPLETED"]
    scheduled_jobs = [j for j in jobs if j.status in ["ASSIGNED", "IN_PROGRESS"]]
    uninvoiced_jobs = [j for j in completed_jobs if not j.invoice_id]

    # 4 Business Solutions stats:
    # 1. Freelancers
    # Invoices & clients above

    # 2. Creators
    creator = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    creator_tips = db.query(Tip).filter(Tip.creator_id == creator.id, Tip.status == "COMPLETED").all() if creator else []
    creator_tip_total = sum([t.amount for t in creator_tips]) or Decimal("0.0")
    subscribers_count = db.query(Subscription).filter(Subscription.creator_id == creator.id, Subscription.status == "ACTIVE").count() if creator else 0

    # 3. Marketplaces
    vendors = db.query(MarketplaceVendor).filter(MarketplaceVendor.user_id == current_user.id).all()
    mkt_orders = db.query(MarketplaceOrder).filter(MarketplaceOrder.user_id == current_user.id).all()
    platform_commissions = sum([mo.platform_commission for mo in mkt_orders]) or Decimal("0.0")

    # 4. Small Merchants & POS
    products_count = db.query(Product).filter(Product.user_id == current_user.id, Product.is_active == True).count()
    pos_orders = db.query(POSOrder).filter(POSOrder.user_id == current_user.id, POSOrder.payment_status == "COMPLETED").all()
    pos_sales_total = sum([po.total_amount for po in pos_orders]) or Decimal("0.0")

    combined_revenue = total_revenue + creator_tip_total + platform_commissions + pos_sales_total

    context_lines = [
        f"Business Name: {business.business_name if business else 'Unified Business Platform'}",
        f"Reporting Currency: {business.default_currency if business else 'USD'}",
        f"Total Combined Multi-Solution Revenue: {business.default_currency if business else 'USD'} {combined_revenue:.2f}",
        f"  - Solution 1 (Freelancers): {len(invoices)} invoices, verified revenue: {business.default_currency if business else 'USD'} {total_revenue:.2f}",
        f"  - Solution 2 (Creators): Handle '@{creator.handle if creator else 'not_set'}', {len(creator_tips)} tips received ({business.default_currency if business else 'USD'} {creator_tip_total:.2f}), {subscribers_count} active members",
        f"  - Solution 3 (Marketplaces): {len(vendors)} active vendors, {len(mkt_orders)} orders, platform commissions earned: {business.default_currency if business else 'USD'} {platform_commissions:.2f}",
        f"  - Solution 4 (Small Merchants): {products_count} inventory products, {len(pos_orders)} POS sales ({business.default_currency if business else 'USD'} {pos_sales_total:.2f})",
        f"Total Payouts / Operating Expenses: {business.default_currency if business else 'USD'} {total_payouts_paid:.2f} paid ({total_payouts_pending:.2f} pending)",
        f"Estimated Net Operating Profit: {business.default_currency if business else 'USD'} {(combined_revenue - total_payouts_paid):.2f}",
    ]

    if overdue_invoices:
        context_lines.append("Overdue Invoices List:")
        for inv in overdue_invoices:
            c = next((cl for cl in clients if cl.id == inv.client_id), None)
            context_lines.append(f"- {inv.invoice_number}: {inv.currency} {inv.total_amount:.2f} due on {inv.due_date} for {c.name if c else 'Client'}")

    if pending_invoices:
        context_lines.append("Pending Invoices List:")
        for inv in pending_invoices:
            c = next((cl for cl in clients if cl.id == inv.client_id), None)
            context_lines.append(f"- {inv.invoice_number}: {inv.currency} {inv.total_amount:.2f} due on {inv.due_date} for {c.name if c else 'Client'}")

    business_context = "\n".join(context_lines)

    gemini = get_gemini_client(db, current_user.id)
    result = await gemini.chat(req.message, business_context)

    return AIChatResponse(
        reply=result["reply"],
        proposed_action=result["proposed_action"],
    )

@router.post("/actions/preview")
def preview_ai_action(
    req: AIActionExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.action_type == "TRIGGER_REMINDERS":
        unpaid = db.query(Invoice).filter(
            Invoice.user_id == current_user.id,
            Invoice.status.in_(["APPROVED", "SENT", "OVERDUE"]),
        ).all()
        return {
            "action_type": req.action_type,
            "preview": f"Will scan {len(unpaid)} active invoices for due date thresholds and prepare reminder dispatches.",
            "requires_confirmation": True,
            "target_count": len(unpaid),
        }
    return {
        "action_type": req.action_type,
        "preview": f"Preview for action '{req.action_type}' prepared.",
        "requires_confirmation": True,
        "payload": req.payload,
    }

@router.post("/actions/execute", response_model=AIActionExecuteResponse)
def execute_ai_action(
    req: AIActionExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Log audit entry for financial safety
    audit = AuditLog(
        user_id=current_user.id,
        entity_type="AI_ACTION",
        entity_id=req.action_type,
        action="EXECUTE_CONFIRMED",
        details=json.dumps(req.payload),
    )
    db.add(audit)
    db.commit()

    if req.action_type == "TRIGGER_REMINDERS":
        # Scan and dispatch reminders
        from backend.app.api.reminders import execute_reminder_scan
        count = execute_reminder_scan(db, current_user.id)
        return AIActionExecuteResponse(
            success=True,
            message=f"Autonomous scan finished: {count} reminder sequences evaluated.",
            data={"reminders_processed": count},
        )

    return AIActionExecuteResponse(
        success=True,
        message=f"Action '{req.action_type}' processed.",
    )

