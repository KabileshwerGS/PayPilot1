from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timezone
from decimal import Decimal

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.business import BusinessProfile
from backend.app.models.staff import Staff
from backend.app.models.jobs import Job
from backend.app.models.payouts import Payout
from backend.app.models.notifications import Notification
from backend.app.models.audit_logs import AuditLog
from backend.app.schemas.payouts import (
    PayoutCreate,
    PayoutCalculateRequest,
    PayoutCalculateResponse,
    PayoutMarkPaidRequest,
    PayoutResponse,
    PayoutListResponse,
    PayoutSummaryResponse,
    StaffPayoutBreakdown,
)

router = APIRouter(prefix="/payouts", tags=["Employee Payouts"])

def generate_payout_reference(db: Session, user_id: int) -> str:
    current_year = datetime.now().year
    prefix = f"PAYOUT-{current_year}-"
    last_payout = (
        db.query(Payout)
        .filter(Payout.user_id == user_id, Payout.payout_reference.like(f"{prefix}%"))
        .order_by(Payout.id.desc())
        .first()
    )
    if not last_payout:
        return f"{prefix}0001"
    try:
        last_num = int(last_payout.payout_reference.split("-")[-1])
        return f"{prefix}{last_num + 1:04d}"
    except (ValueError, IndexError):
        count = db.query(Payout).filter(Payout.user_id == user_id).count()
        return f"{prefix}{count + 1:04d}"

def build_payout_response(p: Payout, db: Session) -> PayoutResponse:
    staff = db.query(Staff).filter(Staff.id == p.staff_id).first()
    job = db.query(Job).filter(Job.id == p.job_id).first() if p.job_id else None

    return PayoutResponse(
        id=p.id,
        staff_id=p.staff_id,
        staff_name=staff.name if staff else "Staff Member",
        staff_role=staff.role if staff else "Cleaner",
        job_id=p.job_id,
        job_number=job.job_number if job else None,
        job_title=job.title if job else None,
        payout_reference=p.payout_reference,
        amount=p.amount,
        currency=p.currency,
        payout_type=p.payout_type,
        status=p.status,
        payment_method=p.payment_method,
        period_start=p.period_start,
        period_end=p.period_end,
        notes=p.notes,
        paid_at=p.paid_at,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )

@router.post("/calculate", response_model=PayoutCalculateResponse)
def calculate_payout_for_job(
    req: PayoutCalculateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == req.job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    staff = db.query(Staff).filter(Staff.id == req.staff_id, Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    terms = staff.payment_terms.upper()
    rate_used = Decimal("0.0")
    basis_quantity = Decimal("1.0")
    calculated_amount = Decimal("0.0")
    payout_type = "HOURLY_WAGE"

    if terms == "HOURLY":
        rate_used = staff.hourly_rate
        basis_quantity = job.actual_hours or job.estimated_hours or Decimal("2.0")
        calculated_amount = basis_quantity * rate_used
        payout_type = "HOURLY_WAGE"
    elif terms == "FIXED_PER_JOB":
        rate_used = staff.fixed_job_rate
        basis_quantity = Decimal("1.0")
        calculated_amount = rate_used
        payout_type = "JOB_COMPENSATION"
    elif terms == "COMMISSION":
        rate_used = staff.commission_rate
        basis_quantity = job.price
        calculated_amount = (job.price * rate_used) / Decimal("100.0")
        payout_type = "COMMISSION"
    else:
        rate_used = staff.hourly_rate
        basis_quantity = job.actual_hours or job.estimated_hours or Decimal("2.0")
        calculated_amount = basis_quantity * rate_used

    return PayoutCalculateResponse(
        job_id=job.id,
        job_number=job.job_number,
        staff_id=staff.id,
        staff_name=staff.name,
        payment_terms=terms,
        rate_used=rate_used,
        basis_quantity=basis_quantity,
        calculated_amount=Decimal(f"{calculated_amount:.2f}"),
        currency=job.currency,
        payout_type=payout_type,
    )

@router.get("", response_model=PayoutListResponse)
def list_payouts(
    status: Optional[str] = Query(None),
    staff_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Payout).filter(Payout.user_id == current_user.id)
    if status:
        query = query.filter(Payout.status == status.upper())
    if staff_id:
        query = query.filter(Payout.staff_id == staff_id)

    payouts = query.order_by(Payout.id.desc()).all()
    results = [build_payout_response(p, db) for p in payouts]
    return PayoutListResponse(payouts=results, total=len(results))

@router.get("/summary", response_model=PayoutSummaryResponse)
def get_payout_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    default_currency = biz.default_currency if biz else "USD"

    total_paid = db.query(func.coalesce(func.sum(Payout.amount), 0.0)).filter(
        Payout.user_id == current_user.id,
        Payout.status == "PAID",
    ).scalar()

    total_approved = db.query(func.coalesce(func.sum(Payout.amount), 0.0)).filter(
        Payout.user_id == current_user.id,
        Payout.status == "APPROVED",
    ).scalar()

    total_pending = db.query(func.coalesce(func.sum(Payout.amount), 0.0)).filter(
        Payout.user_id == current_user.id,
        Payout.status == "PENDING",
    ).scalar()

    all_staff = db.query(Staff).filter(Staff.user_id == current_user.id).all()
    breakdown = []
    for s in all_staff:
        pending_s = db.query(func.coalesce(func.sum(Payout.amount), 0.0)).filter(
            Payout.user_id == current_user.id,
            Payout.staff_id == s.id,
            Payout.status.in_(["PENDING", "APPROVED"]),
        ).scalar()
        paid_s = db.query(func.coalesce(func.sum(Payout.amount), 0.0)).filter(
            Payout.user_id == current_user.id,
            Payout.staff_id == s.id,
            Payout.status == "PAID",
        ).scalar()

        breakdown.append(
            StaffPayoutBreakdown(
                staff_id=s.id,
                staff_name=s.name,
                staff_role=s.role,
                pending_amount=Decimal(str(pending_s or 0.0)),
                paid_amount=Decimal(str(paid_s or 0.0)),
            )
        )

    return PayoutSummaryResponse(
        total_paid=Decimal(str(total_paid or 0.0)),
        total_approved=Decimal(str(total_approved or 0.0)),
        total_pending=Decimal(str(total_pending or 0.0)),
        currency=default_currency,
        breakdown=breakdown,
    )

@router.post("", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
def create_payout(
    req: PayoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    staff = db.query(Staff).filter(Staff.id == req.staff_id, Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    job = None
    if req.job_id:
        job = db.query(Job).filter(Job.id == req.job_id, Job.user_id == current_user.id).first()

    payout_ref = generate_payout_reference(db, current_user.id)
    payout = Payout(
        user_id=current_user.id,
        staff_id=staff.id,
        job_id=job.id if job else None,
        payout_reference=payout_ref,
        amount=req.amount,
        currency=req.currency.upper(),
        payout_type=req.payout_type.upper(),
        status="PENDING",
        payment_method=req.payment_method.upper(),
        period_start=req.period_start,
        period_end=req.period_end,
        notes=req.notes,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="PAYOUT",
        entity_id=str(payout.id),
        action="CREATE",
        details=f"Payout {payout.payout_reference} ({payout.currency} {payout.amount:.2f}) created for {staff.name}.",
    )
    db.add(audit)
    db.commit()

    return build_payout_response(payout, db)

@router.post("/{payout_id}/approve", response_model=PayoutResponse)
def approve_payout(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payout = db.query(Payout).filter(Payout.id == payout_id, Payout.user_id == current_user.id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found.")

    payout.status = "APPROVED"
    db.commit()
    db.refresh(payout)
    return build_payout_response(payout, db)

@router.post("/{payout_id}/mark-paid", response_model=PayoutResponse)
def mark_payout_as_paid(
    payout_id: int,
    req: PayoutMarkPaidRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payout = db.query(Payout).filter(Payout.id == payout_id, Payout.user_id == current_user.id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found.")

    payout.status = "PAID"
    payout.paid_at = datetime.now(timezone.utc)
    payout.payment_method = req.payment_method.upper()
    if req.notes:
        payout.notes = f"{payout.notes or ''} [Paid: {req.notes}]".strip()

    staff = db.query(Staff).filter(Staff.id == payout.staff_id).first()

    notif = Notification(
        user_id=current_user.id,
        title="Payout Disbursed",
        message=f"Payout {payout.payout_reference} of {payout.currency} {payout.amount:.2f} marked as PAID for {staff.name if staff else 'Staff'}.",
        notification_type="PAYOUT_PAID",
        link_url="/payouts",
    )
    db.add(notif)

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="PAYOUT",
        entity_id=str(payout.id),
        action="PAID",
        details=f"Payout {payout.payout_reference} marked as PAID via {payout.payment_method}.",
    )
    db.add(audit)

    db.commit()
    db.refresh(payout)
    return build_payout_response(payout, db)

@router.post("/{payout_id}/cancel", response_model=PayoutResponse)
def cancel_payout(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payout = db.query(Payout).filter(Payout.id == payout_id, Payout.user_id == current_user.id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found.")

    payout.status = "CANCELLED"
    db.commit()
    db.refresh(payout)
    return build_payout_response(payout, db)

