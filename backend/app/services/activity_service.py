from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from app.models.activity import Activity
from app.models.user import User


class ActivityService:
    """Service for managing activities (comments, history, work logs)"""
    
    @staticmethod
    async def create_activity(
        entity_type: str,
        entity_id: uuid.UUID,
        activity_type: str,
        user_id: uuid.UUID,
        user_name: str,
        content: Optional[str] = None,
        action: Optional[str] = None,
        field_name: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        old_value_raw: Optional[Any] = None,
        new_value_raw: Optional[Any] = None,
        hours: Optional[float] = None,
        work_date: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Activity:
        """Create a new activity entry"""
        activity = Activity(
            entity_type=entity_type,
            entity_id=entity_id,
            activity_type=activity_type,
            user_id=user_id,
            user_name=user_name,
            content=content,
            action=action,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            old_value_raw=old_value_raw,
            new_value_raw=new_value_raw,
            hours=hours,
            work_date=work_date,
            metadata=metadata or {}
        )
        await activity.insert()
        return activity
    
    @staticmethod
    async def track_field_change(
        entity_type: str,
        entity_id: uuid.UUID,
        user_id: uuid.UUID,
        user_name: str,
        field_name: str,
        old_value: Any,
        new_value: Any,
        field_display_name: Optional[str] = None
    ) -> Activity:
        """Track a field change as history"""
        # Convert values to display strings
        old_display = ActivityService._format_value(old_value, field_name)
        new_display = ActivityService._format_value(new_value, field_name)
        
        # Generate action text
        display_name = field_display_name or ActivityService._get_field_display_name(field_name)
        action = f"updated the {display_name}"
        
        return await ActivityService.create_activity(
            entity_type=entity_type,
            entity_id=entity_id,
            activity_type="history",
            user_id=user_id,
            user_name=user_name,
            action=action,
            field_name=field_name,
            old_value=old_display,
            new_value=new_display,
            old_value_raw=old_value,
            new_value_raw=new_value
        )
    
    @staticmethod
    def _format_value(value: Any, field_name: str) -> str:
        """Format a value for display"""
        if value is None:
            return "None"
        
        # Handle UUID references (like assignee_id)
        if isinstance(value, uuid.UUID):
            return str(value)
        
        # Handle dates
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        
        # Handle lists
        if isinstance(value, list):
            if len(value) == 0:
                return "None"
            # For lists of names, join them
            if all(isinstance(item, str) for item in value):
                return " & ".join(value)
            return ", ".join(str(item) for item in value)
        
        return str(value)
    
    @staticmethod
    def _get_field_display_name(field_name: str) -> str:
        """Get a human-readable display name for a field"""
        field_map = {
            "status": "Status",
            "assignee_id": "Assigned",
            "priority": "Priority",
            "title": "Title",
            "description": "Description",
            "due_date": "Due Date",
            "story_id": "Parent",
            "project_id": "Project",
            "estimated_hours": "Estimated Hours",
        }
        return field_map.get(field_name, field_name.replace("_", " ").title())
    
    @staticmethod
    async def get_activities(
        entity_type: str,
        entity_id: uuid.UUID,
        activity_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[Activity]:
        """Get activities for an entity"""
        query = Activity.find(
            Activity.entity_type == entity_type,
            Activity.entity_id == entity_id
        )
        
        if activity_type:
            query = query.find(Activity.activity_type == activity_type)
        
        activities = await query.sort(-Activity.created_at).skip(skip).limit(limit).to_list()
        return activities
    
    @staticmethod
    async def get_activity_count(
        entity_type: str,
        entity_id: uuid.UUID,
        activity_type: Optional[str] = None
    ) -> int:
        """Get count of activities for an entity"""
        query = Activity.find(
            Activity.entity_type == entity_type,
            Activity.entity_id == entity_id
        )
        
        if activity_type:
            query = query.find(Activity.activity_type == activity_type)
        
        count = await query.count()
        return count
