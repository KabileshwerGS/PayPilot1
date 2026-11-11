from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.invoices import Invoice
from backend.app.models.clients import Client
from backend.app.models.reminders import Reminder
from backend.app.models.notifications import Notification
from backend.app.schemas.reminders import (
    ReminderResponse,
    ReminderListResponse,
    ReminderProcessResponse,
    ReminderCreate,
    ReminderUpdate,
)

router = APIRouter(prefix="/reminders", tags=["Reminders"])

def execute_reminder_scan(db: Session, user_id: int) -> int:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_date = datetime.strptime(today_str, "%Y-%m-%d")

    unpaid_invoices = db.query(Invoice).filter(
        Invoice.user_id == user_id,
        Invoice.status.in_(["APPROVED", "SENT", "OVERDUE"]),
    ).all()

    sent_count = 0

    for inv in unpaid_invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        if not client:
            continue

        try:
            due_date = datetime.strptime(inv.due_date, "%Y-%m-%d")
        except Exception:
            continue

        days_diff = (today_date - due_date).days

        # 1. Update status to OVERDUE if due_date has passed
        if days_diff > 0 and inv.status != "OVERDUE":
            inv.status = "OVERDUE"
            notif = Notification(
                user_id=user_id,
                title="Invoice Overdue Alert",
                message=f"Invoice {inv.invoice_number} for {client.name} is now overdue by {days_diff} day(s).",
                notification_type="INVOICE_OVERDUE",
                link_url=f"/invoices/{inv.id}",
            )
            db.add(notif)

        # 2. Determine applicable reminder type
        reminder_type = None
        if days_diff == -3:
            reminder_type = "BEFORE_DUE"
        elif days_diff == 0:
            reminder_type = "ON_DUE"
        elif days_diff > 0:
            reminder_type = "AFTER_DUE"

        if not reminder_type:
            continue

        # Prevent duplicate reminders on the same day for this invoice
        existing = db.query(Reminder).filter(
            Reminder.invoice_id == inv.id,
            Reminder.scheduled_date == today_str,
            Reminder.reminder_type == reminder_type,
        ).first()

        if not existing:
            reminder = Reminder(
                user_id=user_id,
                invoice_id=inv.id,
                client_id=client.id,
                reminder_type=reminder_type,
                scheduled_date=today_str,
                sent_at=datetime.now(timezone.utc),
                status="SENT",
                channel="EMAIL",
            )
            db.add(reminder)
            sent_count += 1

            notif = Notification(
                user_id=user_id,
                title=f"Reminder Dispatched: {reminder_type}",
                message=f"Payment reminder automatically dispatched to {client.name} for invoice {inv.invoice_number}.",
                notification_type="REMINDER_SENT",
                link_url=f"/invoices/{inv.id}",
            )
            db.add(notif)

    db.commit()
    return sent_count

@router.get("", response_model=ReminderListResponse)
def get_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id
    ).order_by(Reminder.created_at.desc()).all()

    results = []
    for r in reminders:
        inv = db.query(Invoice).filter(Invoice.id == r.invoice_id).first()
        client = db.query(Client).filter(Client.id == r.client_id).first()
        results.append(
            ReminderResponse(
                id=r.id,
                invoice_id=r.invoice_id,
                invoice_number=inv.invoice_number if inv else "INV",
                client_name=client.name if client else "Client",
                reminder_type=r.reminder_type,
                scheduled_date=r.scheduled_date,
                sent_at=r.sent_at,
                status=r.status,
                error_message=r.error_message,
                channel=r.channel,
            )
        )

    return ReminderListResponse(reminders=results, total=len(results))

@router.post("/process", response_model=ReminderProcessResponse)
def process_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = execute_reminder_scan(db, current_user.id)
    return ReminderProcessResponse(
        message=f"Due date scan complete. {count} reminders logged and dispatched.",
        sent_count=count,
    )

