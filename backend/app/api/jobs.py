from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.clients import Client
from backend.app.models.services import Service
from backend.app.models.staff import Staff
from backend.app.models.jobs import Job, JobAssignment
from backend.app.models.invoices import Invoice, InvoiceItem
from backend.app.models.notifications import Notification
from backend.app.models.audit_logs import AuditLog
from backend.app.schemas.jobs import (
    JobCreate,
    JobUpdate,
    JobCompleteRequest,
    JobCreateInvoiceRequest,
    JobResponse,
    JobListResponse,
    JobAssignmentResponse,
)
from backend.app.schemas.invoices import InvoiceResponse

router = APIRouter(prefix="/jobs", tags=["Job Management"])

def generate_job_number(db: Session, user_id: int) -> str:
    current_year = datetime.now().year
    prefix = f"JOB-{current_year}-"
    last_job = (
        db.query(Job)
        .filter(Job.user_id == user_id, Job.job_number.like(f"{prefix}%"))
        .order_by(Job.id.desc())
        .first()
    )
    if not last_job:
        return f"{prefix}0001"
    try:
        last_num = int(last_job.job_number.split("-")[-1])
        return f"{prefix}{last_num + 1:04d}"
    except (ValueError, IndexError):
        count = db.query(Job).filter(Job.user_id == user_id).count()
        return f"{prefix}{count + 1:04d}"

def generate_invoice_number(db: Session, user_id: int) -> str:
    current_year = datetime.now().year
    prefix = f"INV-{current_year}-"
    last_invoice = (
        db.query(Invoice)
        .filter(Invoice.user_id == user_id, Invoice.invoice_number.like(f"{prefix}%"))
        .order_by(Invoice.id.desc())
        .first()
    )
    if not last_invoice:
        return f"{prefix}0001"
    try:
        last_num = int(last_invoice.invoice_number.split("-")[-1])
        return f"{prefix}{last_num + 1:04d}"
    except (ValueError, IndexError):
        count = db.query(Invoice).filter(Invoice.user_id == user_id).count()
        return f"{prefix}{count + 1:04d}"

def build_job_response(j: Job, db: Session) -> JobResponse:
    client = db.query(Client).filter(Client.id == j.client_id).first()
    service = db.query(Service).filter(Service.id == j.service_id).first() if j.service_id else None
    invoice = db.query(Invoice).filter(Invoice.id == j.invoice_id).first() if j.invoice_id else None

    assignments = []
    for assign in j.assignments:
        staff = db.query(Staff).filter(Staff.id == assign.staff_id).first()
        if staff:
            assignments.append(
                JobAssignmentResponse(
                    id=assign.id,
                    staff_id=staff.id,
                    staff_name=staff.name,
                    staff_role=staff.role,
                    role_in_job=assign.role_in_job,
                    assigned_at=assign.assigned_at,
                )
            )

    return JobResponse(
        id=j.id,
        job_number=j.job_number,
        client_id=j.client_id,
        client_name=client.name if client else "Client",
        client_email=client.email if client else None,
        client_phone=client.phone if client else None,
        service_id=j.service_id,
        service_name=service.name if service else None,
        invoice_id=j.invoice_id,
        invoice_number=invoice.invoice_number if invoice else None,
        title=j.title,
        location_address=j.location_address or (client.billing_address if client else None),
        scheduled_date=j.scheduled_date,
        scheduled_start_time=j.scheduled_start_time,
        scheduled_end_time=j.scheduled_end_time,
        price=j.price,
        currency=j.currency,
        estimated_hours=j.estimated_hours,
        actual_hours=j.actual_hours,
        status=j.status,
        priority=j.priority,
        notes=j.notes,
        completion_notes=j.completion_notes,
        checklist=j.checklist,
        started_at=j.started_at,
        completed_at=j.completed_at,
        created_at=j.created_at,
        updated_at=j.updated_at,
        assignments=assignments,
    )

@router.get("", response_model=JobListResponse)
def list_jobs(
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    staff_id: Optional[int] = Query(None),
    date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.user_id == current_user.id)

    if status:
        query = query.filter(Job.status == status.upper())
    if client_id:
        query = query.filter(Job.client_id == client_id)
    if date:
        query = query.filter(Job.scheduled_date == date)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Job.title.ilike(term)) | (Job.job_number.ilike(term)) | (Job.location_address.ilike(term))
        )
    if staff_id:
        query = query.join(JobAssignment).filter(JobAssignment.staff_id == staff_id)

    jobs = query.order_by(Job.scheduled_date.desc(), Job.id.desc()).all()
    results = [build_job_response(j, db) for j in jobs]
    return JobListResponse(jobs=results, total=len(results))

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == job_in.client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    service = None
    price = job_in.price
    estimated_hours = job_in.estimated_hours
    currency = job_in.currency

    if job_in.service_id:
        service = db.query(Service).filter(Service.id == job_in.service_id, Service.user_id == current_user.id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found.")
        if price is None:
            price = service.price
        if estimated_hours is None or estimated_hours == Decimal("2.0"):
            estimated_hours = service.estimated_duration_hours
        currency = service.currency

    if price is None:
        price = Decimal("0.0")

    job_number = generate_job_number(db, current_user.id)
    location_address = job_in.location_address or client.billing_address or "Client Location"

    job = Job(
        user_id=current_user.id,
        client_id=client.id,
        service_id=service.id if service else None,
        job_number=job_number,
        title=job_in.title.strip(),
        location_address=location_address,
        scheduled_date=job_in.scheduled_date,
        scheduled_start_time=job_in.scheduled_start_time,
        scheduled_end_time=job_in.scheduled_end_time,
        price=price,
        currency=currency,
        estimated_hours=estimated_hours,
        status="ASSIGNED",
        priority=job_in.priority.upper(),
        notes=job_in.notes,
        checklist=job_in.checklist,
    )
    db.add(job)
    db.flush()

    # Assign staff members
    for s_id in job_in.assigned_staff_ids:
        staff = db.query(Staff).filter(Staff.id == s_id, Staff.user_id == current_user.id).first()
        if staff:
            assign = JobAssignment(job_id=job.id, staff_id=staff.id, role_in_job="CLEANER")
            db.add(assign)

    # Record notification
    notif = Notification(
        user_id=current_user.id,
        title="Job Scheduled",
        message=f"Job {job.job_number} ('{job.title}') scheduled for {client.name} on {job.scheduled_date}.",
        notification_type="JOB_SCHEDULED",
        link_url="/jobs",
    )
    db.add(notif)

    db.commit()
    db.refresh(job)

    return build_job_response(job, db)

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return build_job_response(job, db)

@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_in: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job_in.client_id is not None:
        client = db.query(Client).filter(Client.id == job_in.client_id, Client.user_id == current_user.id).first()
        if client:
            job.client_id = client.id
    if job_in.service_id is not None:
        service = db.query(Service).filter(Service.id == job_in.service_id, Service.user_id == current_user.id).first()
        job.service_id = service.id if service else None
    if job_in.title is not None:
        job.title = job_in.title.strip()
    if job_in.location_address is not None:
        job.location_address = job_in.location_address
    if job_in.scheduled_date is not None:
        job.scheduled_date = job_in.scheduled_date
    if job_in.scheduled_start_time is not None:
        job.scheduled_start_time = job_in.scheduled_start_time
    if job_in.scheduled_end_time is not None:
        job.scheduled_end_time = job_in.scheduled_end_time
    if job_in.price is not None:
        job.price = job_in.price
    if job_in.currency is not None:
        job.currency = job_in.currency
    if job_in.estimated_hours is not None:
        job.estimated_hours = job_in.estimated_hours
    if job_in.priority is not None:
        job.priority = job_in.priority.upper()
    if job_in.status is not None:
        job.status = job_in.status.upper()
    if job_in.notes is not None:
        job.notes = job_in.notes
    if job_in.checklist is not None:
        job.checklist = job_in.checklist

    # Re-assign staff if provided
    if job_in.assigned_staff_ids is not None:
        db.query(JobAssignment).filter(JobAssignment.job_id == job.id).delete()
        for s_id in job_in.assigned_staff_ids:
            staff = db.query(Staff).filter(Staff.id == s_id, Staff.user_id == current_user.id).first()
            if staff:
                assign = JobAssignment(job_id=job.id, staff_id=staff.id, role_in_job="CLEANER")
                db.add(assign)

    db.commit()
    db.refresh(job)

    return build_job_response(job, db)

@router.post("/{job_id}/start", response_model=JobResponse)
def start_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    job.status = "IN_PROGRESS"
    if not job.started_at:
        job.started_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(job)
    return build_job_response(job, db)

@router.post("/{job_id}/complete", response_model=JobResponse)
def complete_job(
    job_id: int,
    req: JobCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    job.status = "COMPLETED"
    job.actual_hours = req.actual_hours
    job.completed_at = datetime.now(timezone.utc)
    if not job.started_at:
        job.started_at = job.completed_at - timedelta(hours=float(req.actual_hours))
    if req.completion_notes:
        job.completion_notes = req.completion_notes
    if req.checklist:
        job.checklist = req.checklist

    client = db.query(Client).filter(Client.id == job.client_id).first()

    notif = Notification(
        user_id=current_user.id,
        title="Job Completed",
        message=f"Job {job.job_number} for {client.name if client else 'Client'} has been completed ({req.actual_hours}h recorded). Ready for invoice & payout.",
        notification_type="JOB_COMPLETED",
        link_url="/jobs",
    )
    db.add(notif)

    audit = AuditLog(
        user_id=current_user.id,
        entity_type="JOB",
        entity_id=str(job.id),
        action="COMPLETE",
        details=f"Job {job.job_number} marked as COMPLETED. Actual hours: {req.actual_hours}.",
    )
    db.add(audit)

    db.commit()
    db.refresh(job)
    return build_job_response(job, db)

@router.post("/{job_id}/cancel", response_model=JobResponse)
def cancel_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    job.status = "CANCELLED"
    db.commit()
    db.refresh(job)
    return build_job_response(job, db)

# INVOICE INTEGRATION BRIDGE (Module 4)
@router.post("/{job_id}/create-invoice")
def create_invoice_from_job(
    job_id: int,
    req: JobCreateInvoiceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Prevent duplicate invoice generation unless explicitly authorized
    if job.invoice_id and not req.force_duplicate:
        existing_inv = db.query(Invoice).filter(Invoice.id == job.invoice_id).first()
        inv_num = existing_inv.invoice_number if existing_inv else str(job.invoice_id)
        raise HTTPException(
            status_code=400,
            detail=f"Job {job.job_number} has already been invoiced under Invoice {inv_num}. Pass force_duplicate=True to generate another invoice.",
        )

    client = db.query(Client).filter(Client.id == job.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client for this job does not exist.")

    invoice_number = generate_invoice_number(db, current_user.id)
    today_str = datetime.now().strftime("%Y-%m-%d")
    due_str = (datetime.now() + timedelta(days=req.due_days)).strftime("%Y-%m-%d")

    subtotal = job.price
    tax_rate = req.tax_rate
    tax_amount = (subtotal * tax_rate) / Decimal("100.0")
    total_amount = subtotal + tax_amount
    initial_status = "APPROVED" if req.approve_immediately else "DRAFT"

    invoice = Invoice(
        user_id=current_user.id,
        client_id=client.id,
        invoice_number=invoice_number,
        issue_date=today_str,
        due_date=due_str,
        currency=job.currency,
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        discount_amount=Decimal("0.0"),
        total_amount=total_amount,
        status=initial_status,
        notes=f"Generated from Job {job.job_number}: {job.title}. {job.completion_notes or ''}".strip(),
        terms="Payment due upon receipt or within invoice terms.",
    )
    db.add(invoice)
    db.flush()

    # Create line item
    service = db.query(Service).filter(Service.id == job.service_id).first() if job.service_id else None
    item_desc = f"{job.title}" + (f" ({service.category})" if service else "")
    if job.actual_hours:
        item_desc += f" - {job.actual_hours} hrs completed on {job.scheduled_date}"

    item = InvoiceItem(
        invoice_id=invoice.id,
        description=item_desc,
        quantity=Decimal("1.0"),
        unit_price=job.price,
        total=job.price,
    )
    db.add(item)

    # Link Job to this newly generated Invoice
    job.invoice_id = invoice.id

    notif = Notification(
        user_id=current_user.id,
        title="Invoice Generated from Job",
        message=f"Invoice {invoice.invoice_number} generated for {client.name} from Job {job.job_number}.",
        notification_type="INVOICE_CREATED",
        link_url=f"/invoices/{invoice.id}",
    )
    db.add(notif)

    db.commit()
    db.refresh(job)
    db.refresh(invoice)

    return {
        "message": f"Successfully created invoice {invoice.invoice_number} from job {job.job_number}.",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "total_amount": float(invoice.total_amount),
        "currency": invoice.currency,
        "status": invoice.status,
    }

