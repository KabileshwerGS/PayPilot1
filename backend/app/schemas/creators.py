from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class CreatorProfileCreate(BaseModel):
    handle: str = Field(..., min_length=2, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=255)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    suggested_tips: str = "[5, 10, 25, 50]"
    currency: str = "USD"

class CreatorProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    suggested_tips: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None

class TipCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    supporter_name: Optional[str] = "Kind Supporter"
    supporter_email: Optional[str] = None
    message: Optional[str] = None
    is_anonymous: bool = False

class TipResponse(BaseModel):
    id: int
    supporter_name: str
    amount: Decimal
    currency: str
    message: Optional[str] = None
    is_anonymous: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SubscriptionPlanCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    currency: str = "USD"
    billing_interval: str = "MONTHLY"  # MONTHLY, YEARLY
    perks: Optional[str] = None

class SubscriptionPlanResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: Decimal
    currency: str
    billing_interval: str
    perks: Optional[str] = None
    is_active: bool
    active_subscribers: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class SubscriptionCreate(BaseModel):
    plan_id: int
    subscriber_name: str
    subscriber_email: str

class SubscriptionResponse(BaseModel):
    id: int
    plan_id: int
    plan_name: str
    subscriber_name: str
    subscriber_email: str
    status: str
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CreatorProfileResponse(BaseModel):
    id: int
    handle: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    suggested_tips: str
    currency: str
    is_active: bool
    total_tips_count: int = 0
    total_tips_amount: Decimal = Decimal("0.0")
    total_subscribers: int = 0
    recent_tips: List[TipResponse] = []
    plans: List[SubscriptionPlanResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

