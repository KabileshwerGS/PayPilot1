from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class VendorCreate(BaseModel):
    vendor_name: str = Field(..., min_length=1)
    contact_email: str = Field(..., min_length=3)
    phone: Optional[str] = None
    paypal_email: str = Field(..., min_length=3)
    store_name: str = Field(..., min_length=1)
    commission_rate_pct: Decimal = Decimal("10.0")  # Platform keeps 10%

class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    paypal_email: Optional[str] = None
    store_name: Optional[str] = None
    commission_rate_pct: Optional[Decimal] = None
    status: Optional[str] = None

class VendorProductCreate(BaseModel):
    vendor_id: int
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    currency: str = "USD"
    image_url: Optional[str] = None

class VendorProductResponse(BaseModel):
    id: int
    vendor_id: int
    vendor_name: str
    store_name: str
    name: str
    description: Optional[str] = None
    price: Decimal
    currency: str
    image_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class VendorResponse(BaseModel):
    id: int
    vendor_name: str
    contact_email: str
    phone: Optional[str] = None
    paypal_email: str
    store_name: str
    commission_rate_pct: Decimal
    status: str
    total_sales: Decimal = Decimal("0.0")
    total_commission_paid: Decimal = Decimal("0.0")
    total_net_earnings: Decimal = Decimal("0.0")
    pending_payout: Decimal = Decimal("0.0")
    product_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class MarketplaceCartItem(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1)

class MarketplaceCheckoutRequest(BaseModel):
    buyer_name: str
    buyer_email: str
    items: List[MarketplaceCartItem]

class MarketplaceOrderItemResponse(BaseModel):
    id: int
    vendor_id: int
    vendor_name: str
    store_name: str
    item_name: str
    quantity: int
    unit_price: Decimal
    gross_amount: Decimal
    commission_amount: Decimal
    vendor_net_amount: Decimal

    class Config:
        from_attributes = True

class MarketplaceOrderResponse(BaseModel):
    id: int
    order_number: str
    buyer_name: str
    buyer_email: str
    total_amount: Decimal
    platform_commission: Decimal
    vendor_total: Decimal
    currency: str
    payment_status: str
    items: List[MarketplaceOrderItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

class VendorPayoutResponse(BaseModel):
    id: int
    vendor_id: int
    vendor_name: str
    payout_reference: str
    amount: Decimal
    currency: str
    status: str
    payment_method: str
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

