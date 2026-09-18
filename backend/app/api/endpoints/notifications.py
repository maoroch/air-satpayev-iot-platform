from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Notification, User
from app.schemas.schemas import NotificationResponse
from app.core.security import get_current_user

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    resolved: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.is_resolved == resolved)
    return query.order_by(Notification.created_at.desc()).limit(100).all()

@router.post("/{notification_id}/resolve", response_model=NotificationResponse)
def resolve_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if notif:
        notif.is_resolved = True
        notif.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notif)
    return notif
