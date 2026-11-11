from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ReminderResponse(BaseModel):
    id: int
    invoice_id: int
    invoice_number: str
    client_name: str
    reminder_type: str
    scheduled_date: str
    sent_at: Optional[datetime] = None
    status: str
    error_message: Optional[str] = None
    channel: str

    class Config:
        from_attributes = True

class ReminderListResponse(BaseModel):
    reminders: List[ReminderResponse]
    total: int

class ReminderProcessResponse(BaseModel):
    message: str
    sent_count: int

class ReminderCreate(BaseModel):
    invoice_id: int
    reminder_type: str = "MANUAL"
    scheduled_date: str
    channel: str = "EMAIL"

class ReminderUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[str] = None

