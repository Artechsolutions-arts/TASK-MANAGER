from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationMarkRead
from app.services.notification_service import NotificationService
import uuid

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    is_read: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user)
):
    """Get notifications for current user"""
    notification_service = NotificationService()
    notifications = await notification_service.get_user_notifications(
        user_id=current_user.id,
        is_read=is_read,
        skip=skip,
        limit=limit
    )
    return notifications


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user)
):
    """Get count of unread notifications"""
    notification_service = NotificationService()
    count = await notification_service.get_unread_count(current_user.id)
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Mark a notification as read"""
    notification_service = NotificationService()
    try:
        notification = await notification_service.mark_as_read(
            uuid.UUID(notification_id),
            current_user.id
        )
        return notification
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/mark-all-read", response_model=dict)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read"""
    notification_service = NotificationService()
    count = await notification_service.mark_all_as_read(current_user.id)
    return {"marked_count": count}
