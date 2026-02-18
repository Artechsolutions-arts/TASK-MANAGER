from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.models.task import Epic, Story, Task, Subtask
from app.models.project import Project, ProjectTeam
from app.models.team import Team, TeamMember
from app.schemas.task import (
    EpicCreate, EpicUpdate, EpicResponse,
    StoryCreate, StoryUpdate, StoryResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse,
    AttachmentCreate
)
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from app.services.activity_service import ActivityService
from beanie.operators import In
from datetime import datetime, date
import uuid

router = APIRouter()


# Epic endpoints
@router.post("/epics", response_model=EpicResponse, status_code=status.HTTP_201_CREATED)
async def create_epic(
    epic_data: EpicCreate,
    current_user: User = Depends(require_permission("task", "create"))
):
    """Create a new epic"""
    # Verify project exists and user has access
    project = await Project.find_one(
        Project.id == epic_data.project_id,
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    epic = Epic(
        title=epic_data.title,
        description=epic_data.description,
        project_id=epic_data.project_id,
        status=epic_data.status,
        priority=epic_data.priority,
        assignee_id=epic_data.assignee_id,
        reporter_id=epic_data.reporter_id or current_user.id,
        due_date=epic_data.due_date
    )
    await epic.insert()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="epic",
        resource_id=str(epic.id),
        user_id=str(current_user.id)
    )
    
    return epic


@router.get("/epics", response_model=List[EpicResponse])
async def list_epics(
    project_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
    current_user: User = Depends(require_permission("task", "read"))
):
    """List epics with DB-level filtering (scalable)."""
    # Get visible project IDs only (no full project load)
    base_project_query = Project.find(
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    if project_id:
        base_project_query = base_project_query.find(Project.id == uuid.UUID(project_id))
    project_ids = [p.id for p in await base_project_query.limit(10000).to_list()]
    if not project_ids:
        return []

    epics = await Epic.find(
        In(Epic.project_id, project_ids),
        Epic.deleted_at == None
    ).sort(-Epic.created_at).skip(skip).limit(limit).to_list()
    return epics


@router.put("/epics/{epic_id}", response_model=EpicResponse)
async def update_epic(
    epic_id: str,
    epic_data: EpicUpdate,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Update epic"""
    epic = await Epic.find_one(
        Epic.id == uuid.UUID(epic_id),
        Epic.deleted_at == None
    )
    
    if not epic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epic not found"
        )
    
    # Verify project belongs to organization
    project = await Project.find_one(
        Project.id == epic.project_id,
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epic not found"
        )
    
    update_data = epic_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(epic, field, value)
    
    epic.update_timestamp()
    await epic.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="epic",
        resource_id=str(epic.id),
        user_id=str(current_user.id)
    )
    
    return epic


# Story endpoints
@router.post("/stories", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    story_data: StoryCreate,
    current_user: User = Depends(require_permission("task", "create"))
):
    """Create a new story"""
    story = Story(
        title=story_data.title,
        description=story_data.description,
        epic_id=story_data.epic_id,
        status=story_data.status,
        priority=story_data.priority,
        assignee_id=story_data.assignee_id,
        reporter_id=story_data.reporter_id or current_user.id,
        due_date=story_data.due_date,
        estimated_hours=story_data.estimated_hours
    )
    await story.insert()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="story",
        resource_id=str(story.id),
        user_id=str(current_user.id)
    )
    
    return story


@router.get("/stories", response_model=List[StoryResponse])
async def list_stories(
    epic_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
    current_user: User = Depends(require_permission("task", "read"))
):
    """List stories with DB-level filtering (scalable)."""
    project_ids = await Project.find(
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    ).distinct(Project.id)
    if not project_ids:
        return []

    epic_query = Epic.find(In(Epic.project_id, project_ids), Epic.deleted_at == None)
    if epic_id:
        epic_query = epic_query.find(Epic.id == uuid.UUID(epic_id))
    epic_ids = [e.id for e in await epic_query.limit(10000).to_list()]
    if not epic_ids:
        return []

    stories = await Story.find(
        In(Story.epic_id, epic_ids),
        Story.deleted_at == None
    ).sort(-Story.created_at).skip(skip).limit(limit).to_list()
    return stories


@router.put("/stories/{story_id}", response_model=StoryResponse)
async def update_story(
    story_id: str,
    story_data: StoryUpdate,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Update story"""
    story = await Story.find_one(
        Story.id == uuid.UUID(story_id),
        Story.deleted_at == None
    )
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found"
        )
    
    # Verify epic belongs to organization
    epic = await Epic.find_one(Epic.id == story.epic_id, Epic.deleted_at == None)
    if epic:
        project = await Project.find_one(
            Project.id == epic.project_id,
            Project.organization_id == current_user.organization_id,
            Project.deleted_at == None
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Story not found"
            )
    
    update_data = story_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(story, field, value)
    
    story.update_timestamp()
    await story.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="story",
        resource_id=str(story.id),
        user_id=str(current_user.id)
    )
    
    return story


# Task endpoints
@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(require_permission("task", "create"))
):
    """Create a new task"""
    from app.models.attachment import Attachment
    # Verify project exists
    project = await Project.find_one(
        Project.id == task_data.project_id,
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check permissions based on role - Team Leads can only create tasks for projects assigned to their teams
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if "Team Lead" in role_names:
        # Get teams where user is team lead
        led_teams = await Team.find(
            Team.team_lead_id == current_user.id,
            Team.deleted_at == None
        ).to_list()
        
        team_ids = [t.id for t in led_teams]
        
        if team_ids:
            # Check if project is assigned to any of the user's teams
            all_project_teams = await ProjectTeam.find(
                ProjectTeam.project_id == task_data.project_id
            ).to_list()
            project_team = next((pt for pt in all_project_teams if pt.team_id in team_ids), None)
        else:
            project_team = None
        
        # Also check if user is the team lead of the project
        if not project_team and project.team_lead_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create tasks for projects assigned to your teams"
            )
    
    # Get max position for status
    existing_tasks = await Task.find(
        Task.project_id == task_data.project_id,
        Task.status == task_data.status,
        Task.deleted_at == None
    ).to_list()
    
    max_position = max([t.position for t in existing_tasks], default=0)
    
    # Convert date to datetime if needed (Beanie/MongoDB works better with datetime)
    due_date_dt = None
    if task_data.due_date:
        if isinstance(task_data.due_date, date):
            due_date_dt = datetime.combine(task_data.due_date, datetime.min.time())
        else:
            due_date_dt = task_data.due_date
    
    # Convert story_points to Decimal if provided
    from decimal import Decimal
    story_points_decimal = None
    if task_data.story_points:
        story_points_decimal = Decimal(str(task_data.story_points))
    
    task = Task(
        title=task_data.title,
        description=task_data.description,
        category=task_data.category,
        project_id=task_data.project_id,
        story_id=task_data.story_id,
        sprint_id=task_data.sprint_id,
        status=task_data.status,
        priority=task_data.priority,
        assignee_id=task_data.assignee_id,
        reporter_id=task_data.reporter_id or current_user.id,
        due_date=due_date_dt,
        estimated_hours=task_data.estimated_hours,
        story_points=story_points_decimal,
        position=task_data.position or (max_position + 1),
        labels=task_data.labels or [],
        attachments=[
            Attachment(
                file_name=a.file_name,
                file_type=a.file_type,
                file_data=a.file_data,
                file_size=a.file_size,
                uploaded_by=current_user.id,
            )
            for a in (task_data.attachments or [])
        ],
    )
    await task.insert()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="task",
        resource_id=str(task.id),
        user_id=str(current_user.id)
    )
    
    # Trigger notification if task is assigned
    if task_data.assignee_id and task_data.assignee_id != current_user.id:
        from app.services.notification_service import notify_task_assigned
        user_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email
        await notify_task_assigned(
            assignee_id=task_data.assignee_id,
            task_id=task.id,
            task_title=task.title,
            assigned_by=user_name
        )
    
    return task


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    project_id: Optional[str] = Query(None),
    story_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    reporter_id: Optional[str] = Query(None),
    open_only: Optional[bool] = Query(False),
    sort: Optional[str] = Query(None, description="created_desc|created_asc|updated_desc|updated_asc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
    current_user: User = Depends(require_permission("task", "read"))
):
    """List tasks with DB-level filtering (scalable)."""
    from app.services.permission_service import PermissionService
    from app.models.team import Team, TeamMember

    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]

    # Resolve visible project IDs with minimal in-memory load
    org_id = current_user.organization_id
    base_query = Project.find(
        Project.organization_id == org_id,
        Project.deleted_at == None
    )
    async def _project_ids(q, limit=10000):
        return [p.id for p in await q.limit(limit).to_list()]

    if "CEO" in role_names:
        project_ids = await _project_ids(base_query)
    elif "Manager" in role_names:
        project_ids = await _project_ids(
            base_query.find(Project.manager_id == current_user.id)
        )
    elif "Team Lead" in role_names:
        led_teams = await Team.find(
            Team.team_lead_id == current_user.id,
            Team.deleted_at == None
        ).limit(1000).to_list()
        led_team_ids = [t.id for t in led_teams]
        if not led_team_ids:
            project_ids = []
        else:
            pt_list = await ProjectTeam.find(
                In(ProjectTeam.team_id, led_team_ids)
            ).to_list()
            team_project_ids = list({pt.project_id for pt in pt_list})
            project_ids = await _project_ids(
                Project.find(
                    In(Project.id, team_project_ids),
                    Project.organization_id == org_id,
                    Project.deleted_at == None
                )
            )
    else:  # Member
        tm_list = await TeamMember.find(
            TeamMember.user_id == current_user.id,
            TeamMember.left_at == None
        ).to_list()
        user_team_ids = [tm.team_id for tm in tm_list]
        if not user_team_ids:
            project_ids = []
        else:
            pt_list = await ProjectTeam.find(
                In(ProjectTeam.team_id, user_team_ids)
            ).to_list()
            team_project_ids = list({pt.project_id for pt in pt_list})
            project_ids = await _project_ids(
                Project.find(
                    In(Project.id, team_project_ids),
                    Project.organization_id == org_id,
                    Project.deleted_at == None
                )
            )

    if not project_ids:
        return []

    # Single DB query with filters and pagination
    task_query = Task.find(
        In(Task.project_id, project_ids),
        Task.deleted_at == None
    )
    if "Team Lead" in role_names and "CEO" not in role_names and "Manager" not in role_names:
        task_query = task_query.find(Task.reporter_id == current_user.id)
    if project_id:
        task_query = task_query.find(Task.project_id == uuid.UUID(project_id))
    if story_id:
        task_query = task_query.find(Task.story_id == uuid.UUID(story_id))
    if status:
        task_query = task_query.find(Task.status == status)
    if assignee_id:
        task_query = task_query.find(Task.assignee_id == uuid.UUID(assignee_id))
    if reporter_id:
        task_query = task_query.find(Task.reporter_id == uuid.UUID(reporter_id))
    if open_only:
        task_query = task_query.find(Task.status != "Done")

    if sort == "created_asc":
        task_query = task_query.sort(+Task.created_at)
    elif sort == "updated_desc":
        task_query = task_query.sort(-Task.updated_at)
    elif sort == "updated_asc":
        task_query = task_query.sort(+Task.updated_at)
    else:  # default created_desc
        task_query = task_query.sort(-Task.created_at)

    tasks = await task_query.skip(skip).limit(limit).to_list()

    # Avoid sending inline base64 attachments in list views (fetch via GET /tasks/{id})
    items = []
    for t in tasks:
        d = t.dict()
        d["attachments"] = []
        items.append(d)
    return items


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(require_permission("task", "read"))
):
    """Get task by ID"""
    task = await Task.find_one(
        Task.id == uuid.UUID(task_id),
        Task.deleted_at == None
    )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify project belongs to organization
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
    
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Update task"""
    from app.models.attachment import Attachment
    task = await Task.find_one(
        Task.id == uuid.UUID(task_id),
        Task.deleted_at == None
    )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify project belongs to organization
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
    
    # Store old values for change tracking
    old_values = {}
    fields_to_track = ['status', 'assignee_id', 'priority', 'title', 'description', 'due_date', 'story_id', 'estimated_hours', 'sprint_id', 'story_points']
    
    for field in fields_to_track:
        if hasattr(task, field):
            old_values[field] = getattr(task, field)
    
    # Store old status and assignee for notifications
    old_status = task.status
    old_assignee_id = task.assignee_id
    
    # Get user name for activity tracking
    user_name = f"{current_user.first_name} {current_user.last_name}".strip()
    
    # Update task fields
    update_data = task_data.dict(exclude_unset=True)

    # Attachments: append new items if provided
    if "attachments" in update_data:
        new_attachments = update_data.pop("attachments") or []
        for a in new_attachments:
            task.attachments.append(
                Attachment(
                    file_name=a["file_name"],
                    file_type=a["file_type"],
                    file_data=a["file_data"],
                    file_size=a["file_size"],
                    uploaded_by=current_user.id,
                )
            )
    
    # Convert story_points to Decimal if provided
    if 'story_points' in update_data and update_data['story_points'] is not None:
        from decimal import Decimal
        update_data['story_points'] = Decimal(str(update_data['story_points']))
    
    for field, value in update_data.items():
        old_value = old_values.get(field)
        new_value = value
        
        # Track changes for important fields
        if field in fields_to_track and old_value != new_value:
            # Handle special cases for display
            old_display = old_value
            new_display = new_value
            
            # For assignee_id, try to get user names
            if field == 'assignee_id':
                if old_value:
                    old_user = await User.find_one(User.id == old_value)
                    old_display = f"{old_user.first_name} {old_user.last_name}".strip() if old_user else str(old_value)
                else:
                    old_display = "None"
                
                if new_value:
                    new_user = await User.find_one(User.id == new_value)
                    new_display = f"{new_user.first_name} {new_user.last_name}".strip() if new_user else str(new_value)
                else:
                    new_display = "None"
            
            # For story_id, get story title if possible
            elif field == 'story_id':
                if old_value:
                    old_story = await Story.find_one(Story.id == old_value)
                    old_display = old_story.title if old_story else str(old_value)
                else:
                    old_display = "None"
                
                if new_value:
                    new_story = await Story.find_one(Story.id == new_value)
                    new_display = new_story.title if new_story else str(new_value)
                else:
                    new_display = "None"
            
            # Get field display name
            field_display_name = ActivityService._get_field_display_name(field)
            
            # Track the change
            await ActivityService.track_field_change(
                entity_type="task",
                entity_id=task.id,
                user_id=current_user.id,
                user_name=user_name,
                field_name=field,
                old_value=old_value,
                new_value=new_value,
                field_display_name=field_display_name
            )
        
        # Convert due_date (date -> datetime) for Mongo compatibility
        if field == "due_date" and value:
            if isinstance(value, date):
                value = datetime.combine(value, datetime.min.time())
        setattr(task, field, value)
    
    task.update_timestamp()
    await task.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="task",
        resource_id=str(task.id),
        user_id=str(current_user.id)
    )
    
    # Trigger notifications
    from app.services.notification_service import notify_task_assigned, notify_status_changed
    
    # Notify if assignee changed
    if old_assignee_id != task.assignee_id and task.assignee_id:
        user_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email
        await notify_task_assigned(
            assignee_id=task.assignee_id,
            task_id=task.id,
            task_title=task.title,
            assigned_by=user_name
        )
    
    # Notify if status changed
    if old_status != task.status:
        # Notify assignee if task is assigned
        if task.assignee_id:
            await notify_status_changed(
                user_id=task.assignee_id,
                task_id=task.id,
                task_title=task.title,
                old_status=old_status,
                new_status=task.status
            )
    
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(require_permission("task", "delete"))
):
    """Soft delete task"""
    task = await Task.find_one(
        Task.id == uuid.UUID(task_id),
        Task.deleted_at == None
    )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify project belongs to organization
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
    
    task.soft_delete()
    await task.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="delete",
        resource_type="task",
        resource_id=str(task.id),
        user_id=str(current_user.id)
    )
    
    return None


@router.post("/{task_id}/attachments", response_model=TaskResponse)
async def add_task_attachment(
    task_id: str,
    attachment: AttachmentCreate,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Add an attachment to a task"""
    from app.models.attachment import Attachment

    task = await Task.find_one(
        Task.id == uuid.UUID(task_id),
        Task.deleted_at == None
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Verify project belongs to organization
    project = await Project.find_one(
        Project.id == task.project_id,
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.attachments.append(
        Attachment(
            file_name=attachment.file_name,
            file_type=attachment.file_type,
            file_data=attachment.file_data,
            file_size=attachment.file_size,
            uploaded_by=current_user.id,
        )
    )
    task.update_timestamp()
    await task.save()
    return task


@router.delete("/{task_id}/attachments/{attachment_id}", response_model=TaskResponse)
async def remove_task_attachment(
    task_id: str,
    attachment_id: str,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Remove an attachment from a task"""
    task = await Task.find_one(
        Task.id == uuid.UUID(task_id),
        Task.deleted_at == None
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Verify project belongs to organization
    project = await Project.find_one(
        Project.id == task.project_id,
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    try:
        att_uuid = uuid.UUID(attachment_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid attachment ID")

    before = len(task.attachments)
    task.attachments = [a for a in task.attachments if a.id != att_uuid]
    if len(task.attachments) == before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    task.update_timestamp()
    await task.save()
    return task


# Subtask endpoints
@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=status.HTTP_201_CREATED)
async def create_subtask(
    task_id: str,
    subtask_data: SubtaskCreate,
    current_user: User = Depends(require_permission("task", "create"))
):
    """Create a new subtask"""
    task = await Task.find_one(
        Task.id == uuid.UUID(task_id),
        Task.deleted_at == None
    )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify project belongs to organization
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
    
    subtask = Subtask(
        title=subtask_data.title,
        description=subtask_data.description,
        task_id=uuid.UUID(task_id),
        status=subtask_data.status,
        priority=subtask_data.priority,
        assignee_id=subtask_data.assignee_id,
        reporter_id=subtask_data.reporter_id or current_user.id,
        due_date=subtask_data.due_date,
        estimated_hours=subtask_data.estimated_hours
    )
    await subtask.insert()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="subtask",
        resource_id=str(subtask.id),
        user_id=str(current_user.id)
    )
    
    return subtask


@router.get("/{task_id}/subtasks", response_model=List[SubtaskResponse])
async def list_subtasks(
    task_id: str,
    current_user: User = Depends(require_permission("task", "read"))
):
    """List subtasks for a task"""
    task = await Task.find_one(
        Task.id == uuid.UUID(task_id),
        Task.deleted_at == None
    )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify project belongs to organization
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
    
    subtasks = await Subtask.find(
        Subtask.task_id == uuid.UUID(task_id),
        Subtask.deleted_at == None
    ).sort(+Subtask.created_at).to_list()
    
    return subtasks


@router.put("/subtasks/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    subtask_id: str,
    subtask_data: SubtaskUpdate,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Update subtask"""
    subtask = await Subtask.find_one(
        Subtask.id == uuid.UUID(subtask_id),
        Subtask.deleted_at == None
    )
    
    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
    
    # Verify task and project belong to organization
    task = await Task.find_one(Task.id == subtask.task_id, Task.deleted_at == None)
    if task:
        project = await Project.find_one(
            Project.id == task.project_id,
            Project.organization_id == current_user.organization_id,
            Project.deleted_at == None
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subtask not found"
            )
    
    update_data = subtask_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)
    
    # Update parent task completion if all subtasks are done
    if "is_completed" in update_data or "status" in update_data:
        all_subtasks = await Subtask.find(
            Subtask.task_id == subtask.task_id,
            Subtask.deleted_at == None
        ).to_list()
        if all(s.is_completed or s.status == "Done" for s in all_subtasks):
            task = await Task.find_one(Task.id == subtask.task_id)
            if task and task.status != "Done":
                task.status = "Done"
                task.update_timestamp()
                await task.save()
    
    subtask.update_timestamp()
    await subtask.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="subtask",
        resource_id=str(subtask.id),
        user_id=str(current_user.id)
    )
    
    return subtask
