from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from decimal import Decimal

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.staff import Staff
from backend.app.models.jobs import JobAssignment
from backend.app.models.payouts import Payout
from backend.app.models.audit_logs import AuditLog
from backend.app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse, StaffListResponse

router = APIRouter(prefix="/staff", tags=["Staff Management"])

def build_staff_response(s: Staff, db: Session) -> StaffResponse:
    job_count = db.query(JobAssignment).filter(JobAssignment.staff_id == s.id).count()
    payout_sum = db.query(func.coalesce(func.sum(Payout.amount), 0.0)).filter(
        Payout.staff_id == s.id,
        Payout.status == "PAID",
    ).scalar()

    return StaffResponse(
        id=s.id,
        name=s.name,
        email=s.email,
        phone=s.phone,
        role=s.role,
        employment_type=s.employment_type,
        payment_terms=s.payment_terms,
        hourly_rate=s.hourly_rate,
        fixed_job_rate=s.fixed_job_rate,
        commission_rate=s.commission_rate,
        status=s.status,
        notes=s.notes,
        total_jobs=job_count,
        total_payouts_amount=Decimal(str(payout_sum or 0.0)),
        created_at=s.created_at,
        updated_at=s.updated_at,
    )

@router.get("", response_model=StaffListResponse)
def list_staff(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Staff).filter(Staff.user_id == current_user.id)
    if status:
        query = query.filter(Staff.status == status.upper())
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Staff.name.ilike(term)) | (Staff.role.ilike(term)) | (Staff.email.ilike(term))
        )

    staff_list = query.order_by(Staff.name.asc()).all()
    results = [build_staff_response(s, db) for s in staff_list]
    return StaffListResponse(staff=results, total=len(results))

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    staff_in: StaffCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    staff_member = Staff(
        user_id=current_user.id,
        name=staff_in.name.strip(),
        email=staff_in.email.strip() if staff_in.email else None,
        phone=staff_in.phone.strip() if staff_in.phone else None,
        role=staff_in.role.strip() if staff_in.role else "Cleaner",
        employment_type=staff_in.employment_type.upper(),
        payment_terms=staff_in.payment_terms.upper(),
        hourly_rate=staff_in.hourly_rate,
        fixed_job_rate=staff_in.fixed_job_rate,
        commission_rate=staff_in.commission_rate,
        status=staff_in.status.upper(),
        notes=staff_in.notes,
    )
    db.add(staff_member)
    db.commit()
    db.refresh(staff_member)

    # Log audit event
    audit = AuditLog(
        user_id=current_user.id,
        entity_type="STAFF",
        entity_id=str(staff_member.id),
        action="CREATE",
        details=f"Staff member {staff_member.name} ({staff_member.role}) registered.",
    )
    db.add(audit)
    db.commit()

    return build_staff_response(staff_member, db)

@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff_member(
    staff_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    staff_member = db.query(Staff).filter(Staff.id == staff_id, Staff.user_id == current_user.id).first()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    return build_staff_response(staff_member, db)

@router.put("/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: int,
    staff_in: StaffUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    staff_member = db.query(Staff).filter(Staff.id == staff_id, Staff.user_id == current_user.id).first()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    if staff_in.name is not None:
        staff_member.name = staff_in.name.strip()
    if staff_in.email is not None:
        staff_member.email = staff_in.email.strip() if staff_in.email else None
    if staff_in.phone is not None:
        staff_member.phone = staff_in.phone.strip() if staff_in.phone else None
    if staff_in.role is not None:
        staff_member.role = staff_in.role.strip()
    if staff_in.employment_type is not None:
        staff_member.employment_type = staff_in.employment_type.upper()
    if staff_in.payment_terms is not None:
        staff_member.payment_terms = staff_in.payment_terms.upper()
    if staff_in.hourly_rate is not None:
        staff_member.hourly_rate = staff_in.hourly_rate
    if staff_in.fixed_job_rate is not None:
        staff_member.fixed_job_rate = staff_in.fixed_job_rate
    if staff_in.commission_rate is not None:
        staff_member.commission_rate = staff_in.commission_rate
    if staff_in.status is not None:
        staff_member.status = staff_in.status.upper()
    if staff_in.notes is not None:
        staff_member.notes = staff_in.notes

    db.commit()
    db.refresh(staff_member)

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="STAFF",
        entity_id=str(staff_member.id),
        action="UPDATE",
        details=f"Staff member {staff_member.name} updated.",
    )
    db.add(audit)
    db.commit()

    return build_staff_response(staff_member, db)

@router.delete("/{staff_id}")
def delete_staff(
    staff_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    staff_member = db.query(Staff).filter(Staff.id == staff_id, Staff.user_id == current_user.id).first()
    if not staff_member:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    # Soft-delete by setting status to INACTIVE to preserve job and payout history
    staff_member.status = "INACTIVE"
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="STAFF",
        entity_id=str(staff_member.id),
        action="DEACTIVATE",
        details=f"Staff member {staff_member.name} marked as INACTIVE.",
    )
    db.add(audit)
    db.commit()

    return {"message": f"Staff member '{staff_member.name}' deactivated successfully."}

