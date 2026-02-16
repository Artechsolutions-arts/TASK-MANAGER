from typing import Optional
from datetime import datetime
from pydantic import Field
import uuid
from app.models.base import BaseModel


class Notification(BaseModel):
    """Notification model for MongoDB"""
    
    user_id: uuid.UUID
    type: str = Field(..., max_length=50)  # task_assigned, mentioned, status_changed, overdue, sprint_started, etc.
    title: str = Field(..., max_length=255)
    message: str = Field(..., max_length=1000)
    reference_id: Optional[uuid.UUID] = None  # ID of related entity (task, project, etc.)
    reference_type: Optional[str] = Field(None, max_length=50)  # task, project, sprint, etc.
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "notifications"
        indexes = [
            [("user_id", 1), ("is_read", 1)],
            [("user_id", 1)],
            [("is_read", 1)],
            [("created_at", -1)],  # Descending for recent first
            [("type", 1)],
        ]
