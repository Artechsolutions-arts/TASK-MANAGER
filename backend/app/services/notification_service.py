from typing import List, Optional
from datetime import datetime
import uuid
from app.models.notification import Notification
from app.models.user import User
from app.celery_app import celery_app
from app.core.database import init_db
import asyncio


class NotificationService:
    """Service layer for notification management"""
    
    async def create_notification(
        self,
        user_id: uuid.UUID,
        notification_type: str,
        title: str,
        message: str,
        reference_id: Optional[uuid.UUID] = None,
        reference_type: Optional[str] = None
    ) -> Notification:
        """Create a notification synchronously"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            reference_id=reference_id,
            reference_type=reference_type,
            is_read=False
        )
        await notification.insert()
        return notification
    
    async def create_notification_async(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        reference_id: Optional[str] = None,
        reference_type: Optional[str] = None
    ):
        """Create notification asynchronously via Celery"""
        create_notification_task.delay(
            user_id=str(user_id),
            notification_type=notification_type,
            title=title,
            message=message,
            reference_id=str(reference_id) if reference_id else None,
            reference_type=reference_type
        )
    
    async def get_user_notifications(
        self,
        user_id: uuid.UUID,
        is_read: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = Notification.find(Notification.user_id == user_id)
        
        if is_read is not None:
            query = query.find(Notification.is_read == is_read)
        
        notifications = await query.sort(-Notification.created_at).skip(skip).limit(limit).to_list()
        return notifications
    
    async def mark_as_read(
        self,
        notification_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Notification:
        """Mark a notification as read"""
        notification = await Notification.find_one(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        if not notification:
            raise ValueError("Notification not found")
        
        notification.is_read = True
        await notification.save()
        return notification
    
    async def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        """Mark all notifications as read for a user"""
        notifications = await Notification.find(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).to_list()
        
        count = 0
        for notification in notifications:
            notification.is_read = True
            await notification.save()
            count += 1
        
        return count
    
    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        """Get count of unread notifications"""
        count = await Notification.find(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
        return count


# Celery task for async notification creation
@celery_app.task(name="create_notification")
def create_notification_task(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None
):
    """Celery task to create notification asynchronously"""
    # For now, use synchronous creation
    # In production, you may want to use a sync MongoDB client or handle async properly
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings
    from app.models.notification import Notification
    from beanie import init_beanie
    
    async def _create():
        # Create a new database connection for Celery worker
        client = AsyncIOMotorClient(settings.DATABASE_URL)
        db_name = settings.DATABASE_URL.split("/")[-1].split("?")[0]
        
        # Initialize Beanie for this task
        await init_beanie(
            database=client[db_name],
            document_models=[Notification]
        )
        
        notification = Notification(
            user_id=uuid.UUID(user_id),
            type=notification_type,
            title=title,
            message=message,
            reference_id=uuid.UUID(reference_id) if reference_id else None,
            reference_type=reference_type,
            is_read=False
        )
        await notification.insert()
        client.close()
        return notification
    
    # Run async function in new event loop
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(_create())


# Helper functions for common notification types
async def notify_task_assigned(
    assignee_id: uuid.UUID,
    task_id: uuid.UUID,
    task_title: str,
    assigned_by: str
):
    """Create notification when task is assigned"""
    service = NotificationService()
    # Use async method directly for immediate notification
    await service.create_notification(
        user_id=assignee_id,
        notification_type="task_assigned",
        title="New Task Assigned",
        message=f"You have been assigned to task: {task_title} by {assigned_by}",
        reference_id=task_id,
        reference_type="task"
    )


async def notify_mentioned(
    user_id: uuid.UUID,
    mentioned_by: str,
    comment_id: uuid.UUID,
    context: str
):
    """Create notification when user is mentioned"""
    service = NotificationService()
    await service.create_notification(
        user_id=user_id,
        notification_type="mentioned",
        title="You were mentioned",
        message=f"{mentioned_by} mentioned you in a comment: {context}",
        reference_id=comment_id,
        reference_type="activity"
    )


async def notify_status_changed(
    user_id: uuid.UUID,
    task_id: uuid.UUID,
    task_title: str,
    old_status: str,
    new_status: str
):
    """Create notification when task status changes"""
    service = NotificationService()
    await service.create_notification(
        user_id=user_id,
        notification_type="status_changed",
        title="Task Status Updated",
        message=f"Task '{task_title}' status changed from {old_status} to {new_status}",
        reference_id=task_id,
        reference_type="task"
    )


async def notify_overdue(
    user_id: uuid.UUID,
    task_id: uuid.UUID,
    task_title: str
):
    """Create notification for overdue task"""
    service = NotificationService()
    await service.create_notification(
        user_id=user_id,
        notification_type="overdue",
        title="Task Overdue",
        message=f"Task '{task_title}' is now overdue",
        reference_id=task_id,
        reference_type="task"
    )
