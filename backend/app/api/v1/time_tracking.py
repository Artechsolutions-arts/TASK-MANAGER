from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.models.time_tracking import TimeEntry
from app.schemas.time_tracking import TimeEntryCreate, TimeEntryUpdate, TimeEntryResponse
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from beanie.operators import In
from datetime import datetime, date
import uuid

router = APIRouter()


@router.post("", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_time_entry(
    time_data: TimeEntryCreate,
    current_user: User = Depends(require_permission("time", "create"))
):
    """Create a new time entry"""
    time_entry = TimeEntry(
        user_id=current_user.id,
        project_id=time_data.project_id,
        task_id=time_data.task_id,
        subtask_id=time_data.subtask_id,
        hours=time_data.hours,
        date=time_data.date,
        description=time_data.description
    )
    await time_entry.insert()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="time_entry",
        resource_id=str(time_entry.id),
        user_id=str(current_user.id)
    )
    
    return time_entry


@router.get("", response_model=List[TimeEntryResponse])
async def list_time_entries(
    project_id: Optional[str] = Query(None),
    task_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
    current_user: User = Depends(require_permission("time", "read"))
):
    """List time entries with filtering (DB-level, scalable)."""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]

    # Resolve which user IDs we can see
    if "CEO" in role_names or "Manager" in role_names:
        org_user_ids = [
            u.id for u in await User.find(
                User.organization_id == current_user.organization_id,
                User.deleted_at == None
            ).limit(10000).to_list()
        ]
        if user_id:
            user_uuid = uuid.UUID(user_id)
            if user_uuid not in org_user_ids:
                org_user_ids = []
            else:
                org_user_ids = [user_uuid]
    else:
        org_user_ids = [current_user.id]

    if not org_user_ids:
        return []

    # Single DB query with filters and pagination
    query = TimeEntry.find(
        In(TimeEntry.user_id, org_user_ids),
        TimeEntry.deleted_at == None
    )
    if project_id:
        query = query.find(TimeEntry.project_id == uuid.UUID(project_id))
    if task_id:
        query = query.find(TimeEntry.task_id == uuid.UUID(task_id))
    if start_date:
        query = query.find(TimeEntry.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.find(TimeEntry.date <= date.fromisoformat(end_date))

    entries = await query.sort(-TimeEntry.date).skip(skip).limit(limit).to_list()
    return entries


@router.put("/{time_entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    time_entry_id: str,
    time_data: TimeEntryUpdate,
    current_user: User = Depends(require_permission("time", "update"))
):
    """Update time entry"""
    time_entry = await TimeEntry.find_one(
        TimeEntry.id == uuid.UUID(time_entry_id),
        TimeEntry.deleted_at == None
    )
    
    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )
    
    # Verify user belongs to organization
    user = await User.find_one(
        User.id == time_entry.user_id,
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )
    
    # Users can only update their own entries unless they're admin
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if time_entry.user_id != current_user.id and "CEO" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own time entries"
        )
    
    update_data = time_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(time_entry, field, value)
    
    time_entry.update_timestamp()
    await time_entry.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="time_entry",
        resource_id=str(time_entry.id),
        user_id=str(current_user.id)
    )
    
    return time_entry


@router.delete("/{time_entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    time_entry_id: str,
    current_user: User = Depends(require_permission("time", "delete"))
):
    """Soft delete time entry"""
    time_entry = await TimeEntry.find_one(
        TimeEntry.id == uuid.UUID(time_entry_id),
        TimeEntry.deleted_at == None
    )
    
    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )
    
    # Verify user belongs to organization
    user = await User.find_one(
        User.id == time_entry.user_id,
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )
    
    # Users can only delete their own entries unless they're admin
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if time_entry.user_id != current_user.id and "CEO" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own time entries"
        )
    
    time_entry.soft_delete()
    await time_entry.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="delete",
        resource_type="time_entry",
        resource_id=str(time_entry.id),
        user_id=str(current_user.id)
    )
    
    return None
