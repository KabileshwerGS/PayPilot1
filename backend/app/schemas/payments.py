from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class PayPalOrderCreateResponse(BaseModel):
    order_id: str
    status: str
    invoice_id: int
    amount: Decimal
    currency: str

class PayPalCaptureRequest(BaseModel):
    invoice_id: int

class PaymentResponse(BaseModel):
    id: int
    payment_source: str = "Freelancer Invoice"
    customer: str = "Client"
    transaction_id: str
    provider: str
    amount: Decimal
    currency: str
    status: str
    provider_reference: Optional[str] = None
    payment_date: str
    created_at: datetime
    invoice_id: Optional[int] = None
    invoice_number: Optional[str] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True

class PaymentListResponse(BaseModel):
    payments: List[PaymentResponse]
    total: int

