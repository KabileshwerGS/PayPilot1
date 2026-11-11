from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = "Residential"
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    currency: str = "USD"
    estimated_duration_hours: Decimal = Decimal("2.0")
    pricing_type: str = "FLAT_RATE"  # FLAT_RATE, HOURLY
    is_active: bool = True

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    estimated_duration_hours: Optional[Decimal] = None
    pricing_type: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    price: Decimal
    currency: str
    estimated_duration_hours: Decimal
    pricing_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ServiceListResponse(BaseModel):
    services: List[ServiceResponse]
    total: int

