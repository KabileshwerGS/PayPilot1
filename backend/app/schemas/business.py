from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class BusinessProfileCreate(BaseModel):
    business_name: str
    business_type: str = "Freelancer"
    owner_name: str
    email: EmailStr
    phone: Optional[str] = None
    country: str = "United States"
    address: Optional[str] = None
    default_currency: str = "USD"
    time_zone: str = "UTC"

class BusinessProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    owner_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    default_currency: Optional[str] = None
    time_zone: Optional[str] = None

class BusinessProfileResponse(BaseModel):
    id: int
    business_name: str
    business_type: str
    owner_name: str
    email: str
    phone: Optional[str] = None
    country: str
    address: Optional[str] = None
    default_currency: str
    time_zone: str
    created_at: datetime

    class Config:
        from_attributes = True

