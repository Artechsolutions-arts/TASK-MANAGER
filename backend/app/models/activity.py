from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import Field
import uuid
from app.models.base import BaseModel


class Activity(BaseModel):
    """Activity model for tracking comments, history, and work logs on tasks"""
    
    # Entity this activity is related to
    entity_type: str = Field(..., max_length=50)  # 'task', 'project', 'story', 'epic'
    entity_id: uuid.UUID
    
    # Activity type
    activity_type: str = Field(..., max_length=50)  # 'comment', 'history', 'work_log'
    
    # User who performed the action
    user_id: uuid.UUID
    user_name: str = Field(..., max_length=255)  # Cached for performance
    
    # Content
    content: Optional[str] = Field(None, max_length=10000)  # For comments
    action: Optional[str] = Field(None, max_length=100)  # e.g., "updated the Assigned", "changed the Parent"
    
    # For history tracking
    field_name: Optional[str] = Field(None, max_length=100)  # e.g., "status", "assignee_id"
    old_value: Optional[str] = Field(None, max_length=500)  # Display value
    new_value: Optional[str] = Field(None, max_length=500)  # Display value
    old_value_raw: Optional[Any] = None  # Raw value for complex types
    new_value_raw: Optional[Any] = None  # Raw value for complex types
    
    # For work log
    hours: Optional[float] = None
    work_date: Optional[datetime] = None
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    class Settings:
        name = "activities"
        indexes = [
            [("entity_type", 1), ("entity_id", 1)],
            [("activity_type", 1)],
            [("user_id", 1)],
            [("created_at", -1)],
            [("entity_type", 1), ("entity_id", 1), ("activity_type", 1)],
        ]
