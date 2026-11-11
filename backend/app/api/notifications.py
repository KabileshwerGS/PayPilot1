from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.users import User
from backend.app.models.notifications import Notification
from backend.app.schemas.notifications import NotificationResponse, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=NotificationListResponse)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

    unread_count = sum(1 for n in notifs if not n.is_read)
    return NotificationListResponse(notifications=notifs, unread_count=unread_count)

@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Notification marked as read."}

@router.delete("")
def clear_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Notifications cleared."}

