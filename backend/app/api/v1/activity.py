from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.models.activity import Activity
from app.models.task import Task
from app.models.project import Project
from app.schemas.activity import ActivityCreate, ActivityResponse, ActivityListResponse
from app.services.activity_service import ActivityService
from datetime import datetime
import uuid

router = APIRouter()


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity_data: ActivityCreate,
    current_user: User = Depends(require_permission("task", "read"))  # Anyone with task read can comment
):
    """Create a new activity (comment or work log)"""
    # Verify entity exists and user has access
    if activity_data.entity_type == "task":
        task = await Task.find_one(
            Task.id == activity_data.entity_id,
            Task.deleted_at == None
        )
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Verify project access
        project = await Project.find_one(
            Project.id == task.project_id,
            Project.organization_id == current_user.organization_id,
            Project.deleted_at == None
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
    
    # Get user name
    user_name = f"{current_user.first_name} {current_user.last_name}".strip()
    
    # Create activity
    activity = await ActivityService.create_activity(
        entity_type=activity_data.entity_type,
        entity_id=activity_data.entity_id,
        activity_type=activity_data.activity_type,
        user_id=current_user.id,
        user_name=user_name,
        content=activity_data.content,
        action=activity_data.action,
        field_name=activity_data.field_name,
        old_value=activity_data.old_value,
        new_value=activity_data.new_value,
        hours=activity_data.hours,
        work_date=activity_data.work_date,
        metadata=activity_data.metadata
    )
    
    # Trigger notifications for mentioned users
    if activity_data.activity_type == 'comment' and activity_data.metadata:
        tagged_user_ids = activity_data.metadata.get('tagged_users', [])
        if tagged_user_ids:
            from app.services.notification_service import notify_mentioned
            for user_id_str in tagged_user_ids:
                try:
                    user_id = uuid.UUID(user_id_str) if isinstance(user_id_str, str) else user_id_str
                    # Get task/project context for notification
                    context = activity_data.content[:100] if activity_data.content else 'a comment'
                    await notify_mentioned(
                        user_id=user_id,
                        mentioned_by=user_name,
                        comment_id=activity.id,
                        context=context
                    )
                except Exception as e:
                    # Log error but don't fail the comment creation
                    print(f"Failed to notify mentioned user {user_id_str}: {e}")
    
    return activity


@router.get("", response_model=ActivityListResponse)
async def list_activities(
    entity_type: str = Query(..., description="Entity type: task, project, story, epic"),
    entity_id: str = Query(..., description="Entity ID"),
    activity_type: Optional[str] = Query(None, description="Filter by activity type: comment, history, work_log"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_user: User = Depends(require_permission("task", "read"))
):
    """Get activities for an entity"""
    try:
        entity_uuid = uuid.UUID(entity_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity ID"
        )
    
    # Verify entity exists and user has access
    if entity_type == "task":
        task = await Task.find_one(
            Task.id == entity_uuid,
            Task.deleted_at == None
        )
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Verify project access
        project = await Project.find_one(
            Project.id == task.project_id,
            Project.organization_id == current_user.organization_id,
            Project.deleted_at == None
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
    
    # Get activities
    activities = await ActivityService.get_activities(
        entity_type=entity_type,
        entity_id=entity_uuid,
        activity_type=activity_type,
        skip=skip,
        limit=limit
    )
    
    # Get total count
    total = await ActivityService.get_activity_count(
        entity_type=entity_type,
        entity_id=entity_uuid,
        activity_type=activity_type
    )
    
    return ActivityListResponse(
        items=activities,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: str,
    current_user: User = Depends(require_permission("task", "read"))
):
    """Get a specific activity"""
    try:
        activity_uuid = uuid.UUID(activity_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid activity ID"
        )
    
    activity = await Activity.find_one(Activity.id == activity_uuid)
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Verify access through entity
    if activity.entity_type == "task":
        task = await Task.find_one(
            Task.id == activity.entity_id,
            Task.deleted_at == None
        )
        if task:
            project = await Project.find_one(
                Project.id == task.project_id,
                Project.organization_id == current_user.organization_id,
                Project.deleted_at == None
            )
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Activity not found"
                )
    
    return activity
