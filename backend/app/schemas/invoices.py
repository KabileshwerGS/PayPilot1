from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class InvoiceItemCreate(BaseModel):
    description: str = Field(..., min_length=1)
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)

class InvoiceItemResponse(BaseModel):
    id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    total: Decimal

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    client_id: int
    currency: str = "USD"
    issue_date: str
    due_date: str
    tax_rate: Decimal = Decimal("0.0")
    discount_amount: Decimal = Decimal("0.0")
    notes: Optional[str] = None
    terms: Optional[str] = None
    items: List[InvoiceItemCreate]
    approve_immediately: bool = False

class InvoiceUpdate(BaseModel):
    currency: Optional[str] = None
    due_date: Optional[str] = None
    tax_rate: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_company: Optional[str] = None
    client_address: Optional[str] = None
    issue_date: str
    due_date: str
    currency: str
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    status: str
    notes: Optional[str] = None
    terms: Optional[str] = None
    paypal_order_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True

class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total: int

class PublicInvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    business_name: str
    client_name: str
    client_email: str
    issue_date: str
    due_date: str
    currency: str
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    status: str
    notes: Optional[str] = None
    terms: Optional[str] = None
    paypal_client_id: Optional[str] = None
    items: List[InvoiceItemResponse] = []

