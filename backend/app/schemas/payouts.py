from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class PayoutCreate(BaseModel):
    staff_id: int
    job_id: Optional[int] = None
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    payout_type: str = "HOURLY_WAGE"  # HOURLY_WAGE, JOB_COMPENSATION, COMMISSION, BONUS
    payment_method: str = "MANUAL"  # BANK_TRANSFER, MANUAL, PAYPAL_RECORD, CASH, CHECK
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    notes: Optional[str] = None

class PayoutCalculateRequest(BaseModel):
    job_id: int
    staff_id: int

class PayoutCalculateResponse(BaseModel):
    job_id: int
    job_number: str
    staff_id: int
    staff_name: str
    payment_terms: str
    rate_used: Decimal
    basis_quantity: Decimal
    calculated_amount: Decimal
    currency: str
    payout_type: str

class PayoutMarkPaidRequest(BaseModel):
    payment_method: str = "MANUAL"
    notes: Optional[str] = None

class PayoutResponse(BaseModel):
    id: int
    staff_id: int
    staff_name: str
    staff_role: str
    job_id: Optional[int] = None
    job_number: Optional[str] = None
    job_title: Optional[str] = None
    payout_reference: str
    amount: Decimal
    currency: str
    payout_type: str
    status: str  # PENDING, APPROVED, PAID, CANCELLED
    payment_method: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PayoutListResponse(BaseModel):
    payouts: List[PayoutResponse]
    total: int

class StaffPayoutBreakdown(BaseModel):
    staff_id: int
    staff_name: str
    staff_role: str
    pending_amount: Decimal
    paid_amount: Decimal

class PayoutSummaryResponse(BaseModel):
    total_paid: Decimal
    total_approved: Decimal
    total_pending: Decimal
    currency: str
    breakdown: List[StaffPayoutBreakdown]

