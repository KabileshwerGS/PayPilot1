from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    link_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int

