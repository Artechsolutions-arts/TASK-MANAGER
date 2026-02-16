from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.models.sprint import Sprint
from app.schemas.sprint import SprintCreate, SprintUpdate, SprintResponse, SprintSummary
from app.services.sprint_service import SprintService
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from datetime import datetime
import uuid

router = APIRouter()


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    sprint_data: SprintCreate,
    current_user: User = Depends(require_permission("project", "create"))  # Manager+ can create sprints
):
    """Create a new sprint (Manager and above only)"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    # Only Manager and CEO can create sprints
    if "Manager" not in role_names and "CEO" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and CEOs can create sprints"
        )
    
    sprint_service = SprintService()
    try:
        sprint = await sprint_service.create_sprint(
            name=sprint_data.name,
            project_id=sprint_data.project_id,
            start_date=sprint_data.start_date,
            end_date=sprint_data.end_date,
            goal=sprint_data.goal,
            committed_story_points=sprint_data.committed_story_points or 0,
            created_by=current_user.id
        )
        return sprint
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[SprintResponse])
async def list_sprints(
    project_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(require_permission("project", "read"))
):
    """List sprints with optional filters"""
    sprint_service = SprintService()
    
    project_uuid = uuid.UUID(project_id) if project_id else None
    
    sprints = await sprint_service.list_sprints(
        project_id=project_uuid,
        status=status_filter,
        skip=skip,
        limit=limit
    )
    return sprints


@router.get("/{sprint_id}", response_model=SprintResponse)
async def get_sprint(
    sprint_id: str,
    current_user: User = Depends(require_permission("project", "read"))
):
    """Get sprint details"""
    sprint = await Sprint.find_one(
        Sprint.id == uuid.UUID(sprint_id),
        Sprint.deleted_at == None
    )
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    return sprint


@router.put("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: str,
    sprint_data: SprintUpdate,
    current_user: User = Depends(require_permission("project", "update"))
):
    """Update sprint (Manager and above only)"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if "Manager" not in role_names and "CEO" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and CEOs can update sprints"
        )
    
    sprint = await Sprint.find_one(
        Sprint.id == uuid.UUID(sprint_id),
        Sprint.deleted_at == None
    )
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
    
    if sprint_data.name:
        sprint.name = sprint_data.name
    if sprint_data.start_date:
        sprint.start_date = sprint_data.start_date
    if sprint_data.end_date:
        sprint.end_date = sprint_data.end_date
    if sprint_data.goal is not None:
        sprint.goal = sprint_data.goal
    if sprint_data.committed_story_points is not None:
        sprint.committed_story_points = sprint_data.committed_story_points
    
    sprint.update_timestamp()
    await sprint.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="sprint",
        resource_id=str(sprint.id),
        user_id=str(current_user.id)
    )
    
    return sprint


@router.post("/{sprint_id}/start", response_model=SprintResponse)
async def start_sprint(
    sprint_id: str,
    current_user: User = Depends(require_permission("project", "update"))
):
    """Start a sprint (Manager and above only)"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if "Manager" not in role_names and "CEO" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and CEOs can start sprints"
        )
    
    sprint_service = SprintService()
    try:
        sprint = await sprint_service.start_sprint(uuid.UUID(sprint_id), current_user.id)
        return sprint
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{sprint_id}/complete", response_model=SprintResponse)
async def complete_sprint(
    sprint_id: str,
    current_user: User = Depends(require_permission("project", "update"))
):
    """Complete a sprint (Manager and above only)"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if "Manager" not in role_names and "CEO" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and CEOs can complete sprints"
        )
    
    sprint_service = SprintService()
    try:
        sprint = await sprint_service.complete_sprint(uuid.UUID(sprint_id), current_user.id)
        return sprint
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{sprint_id}/summary", response_model=SprintSummary)
async def get_sprint_summary(
    sprint_id: str,
    current_user: User = Depends(require_permission("project", "read"))
):
    """Get sprint summary with progress"""
    sprint_service = SprintService()
    try:
        summary = await sprint_service.get_sprint_summary(uuid.UUID(sprint_id))
        return summary
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
