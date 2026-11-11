from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    category: str = "General"
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    cost_price: Decimal = Decimal("0.0")
    currency: str = "USD"
    stock_quantity: int = 100
    track_inventory: bool = True
    barcode: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    track_inventory: Optional[bool] = None
    barcode: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    category: str
    description: Optional[str] = None
    price: Decimal
    cost_price: Decimal
    currency: str
    stock_quantity: int
    track_inventory: bool
    barcode: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class POSCartItem(BaseModel):
    product_id: Optional[int] = None
    name: str
    sku: Optional[str] = None
    price: Decimal
    quantity: int = Field(1, ge=1)

class POSCheckoutRequest(BaseModel):
    items: List[POSCartItem]
    payment_method: str = "PAYPAL_QR"  # PAYPAL_QR, CARD, CASH
    tax_rate: Decimal = Decimal("0.0")
    discount_amount: Decimal = Decimal("0.0")
    cash_tendered: Optional[Decimal] = None

class POSOrderItemResponse(BaseModel):
    id: int
    product_name: str
    sku: Optional[str] = None
    quantity: int
    unit_price: Decimal
    total: Decimal

    class Config:
        from_attributes = True

class POSOrderResponse(BaseModel):
    id: int
    order_number: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    currency: str
    payment_method: str
    payment_status: str
    cash_tendered: Optional[Decimal] = None
    change_due: Optional[Decimal] = None
    qr_code_token: Optional[str] = None
    items: List[POSOrderItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

