from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class JobAssignmentCreate(BaseModel):
    staff_id: int
    role_in_job: str = "CLEANER"

class JobAssignmentResponse(BaseModel):
    id: int
    staff_id: int
    staff_name: str
    staff_role: str
    role_in_job: str
    assigned_at: datetime

    class Config:
        from_attributes = True

class JobCreate(BaseModel):
    client_id: int
    service_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    location_address: Optional[str] = None
    scheduled_date: str
    scheduled_start_time: Optional[str] = None
    scheduled_end_time: Optional[str] = None
    price: Optional[Decimal] = None
    currency: str = "USD"
    estimated_hours: Decimal = Decimal("2.0")
    priority: str = "NORMAL"  # LOW, NORMAL, HIGH, URGENT
    notes: Optional[str] = None
    checklist: Optional[str] = None
    assigned_staff_ids: List[int] = []

class JobUpdate(BaseModel):
    client_id: Optional[int] = None
    service_id: Optional[int] = None
    title: Optional[str] = None
    location_address: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_start_time: Optional[str] = None
    scheduled_end_time: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    estimated_hours: Optional[Decimal] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    checklist: Optional[str] = None
    status: Optional[str] = None
    assigned_staff_ids: Optional[List[int]] = None

class JobCompleteRequest(BaseModel):
    actual_hours: Decimal = Field(..., gt=0)
    completion_notes: Optional[str] = None
    checklist: Optional[str] = None

class JobCreateInvoiceRequest(BaseModel):
    approve_immediately: bool = False
    tax_rate: Decimal = Decimal("0.0")
    due_days: int = 14
    force_duplicate: bool = False

class JobResponse(BaseModel):
    id: int
    job_number: str
    client_id: int
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    invoice_id: Optional[int] = None
    invoice_number: Optional[str] = None
    title: str
    location_address: Optional[str] = None
    scheduled_date: str
    scheduled_start_time: Optional[str] = None
    scheduled_end_time: Optional[str] = None
    price: Decimal
    currency: str
    estimated_hours: Decimal
    actual_hours: Optional[Decimal] = None
    status: str  # ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    priority: str
    notes: Optional[str] = None
    completion_notes: Optional[str] = None
    checklist: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assignments: List[JobAssignmentResponse] = []

    class Config:
        from_attributes = True

class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int

