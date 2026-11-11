from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class StaffCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "Cleaner"
    employment_type: str = "CONTRACTOR"  # FULL_TIME, PART_TIME, CONTRACTOR
    payment_terms: str = "HOURLY"  # HOURLY, FIXED_PER_JOB, COMMISSION
    hourly_rate: Decimal = Decimal("0.0")
    fixed_job_rate: Decimal = Decimal("0.0")
    commission_rate: Decimal = Decimal("0.0")
    status: str = "ACTIVE"  # ACTIVE, INACTIVE, ON_LEAVE
    notes: Optional[str] = None

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    employment_type: Optional[str] = None
    payment_terms: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    fixed_job_rate: Optional[Decimal] = None
    commission_rate: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class StaffResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    employment_type: str
    payment_terms: str
    hourly_rate: Decimal
    fixed_job_rate: Decimal
    commission_rate: Decimal
    status: str
    notes: Optional[str] = None
    total_jobs: int = 0
    total_payouts_amount: Decimal = Decimal("0.0")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StaffListResponse(BaseModel):
    staff: List[StaffResponse]
    total: int

