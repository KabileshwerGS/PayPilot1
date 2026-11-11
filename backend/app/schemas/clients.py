from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    country: str = "United States"
    billing_address: Optional[str] = None
    preferred_currency: str = "USD"
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    country: Optional[str] = None
    billing_address: Optional[str] = None
    preferred_currency: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    country: str
    billing_address: Optional[str] = None
    preferred_currency: str
    notes: Optional[str] = None
    is_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ClientListResponse(BaseModel):
    clients: List[ClientResponse]
    total: int

