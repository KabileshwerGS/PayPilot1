from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from datetime import datetime, timezone

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.clients import Client
from backend.app.models.invoices import Invoice
from backend.app.models.payments import Payment
from backend.app.models.notifications import Notification

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Total verified revenue: calculated strictly from COMPLETED payment records
    revenue_sum = db.query(func.sum(Payment.amount)).filter(
        Payment.user_id == current_user.id,
        Payment.status == "COMPLETED",
    ).scalar() or Decimal("0.0")

    # Pending amount: unpaid invoices with status APPROVED or SENT
    pending_sum = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.user_id == current_user.id,
        Invoice.status.in_(["APPROVED", "SENT"]),
    ).scalar() or Decimal("0.0")

    # Overdue amount: invoices marked as OVERDUE
    overdue_sum = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.user_id == current_user.id,
        Invoice.status == "OVERDUE",
    ).scalar() or Decimal("0.0")

    total_clients = db.query(Client).filter(
        Client.user_id == current_user.id,
        Client.is_archived == False,
    ).count()

    total_invoices = db.query(Invoice).filter(
        Invoice.user_id == current_user.id,
        Invoice.status != "CANCELLED",
    ).count()

    successful_payments = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.status == "COMPLETED",
    ).count()

    return {
        "total_revenue": f"{revenue_sum:.2f}",
        "pending_amount": f"{pending_sum:.2f}",
        "overdue_amount": f"{overdue_sum:.2f}",
        "total_clients": total_clients,
        "total_invoices": total_invoices,
        "successful_payments": successful_payments,
    }

@router.get("/revenue")
def get_revenue_trends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Retrieve monthly totals of verified payments
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.status == "COMPLETED",
    ).order_by(Payment.created_at.asc()).all()

    monthly_map = {}
    for p in payments:
        month_key = p.payment_date[:7] if len(p.payment_date) >= 7 else p.created_at.strftime("%Y-%m")
        monthly_map[month_key] = monthly_map.get(month_key, Decimal("0.0")) + p.amount

    trends = [{"month": k, "revenue": float(v)} for k, v in sorted(monthly_map.items())]
    return {"trends": trends}

@router.get("/activity")
def get_recent_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id,
    ).order_by(Notification.created_at.desc()).limit(10).all()

    activities = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.notification_type,
            "date": n.created_at.strftime("%b %d, %H:%M"),
        }
        for n in notifs
    ]
    return {"activities": activities}

