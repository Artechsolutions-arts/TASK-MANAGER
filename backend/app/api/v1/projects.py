from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.models.project import Project, ProjectTeam
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectWithDetails
from app.services.audit_service import AuditService
from beanie.operators import In
from datetime import datetime, date
import uuid

router = APIRouter()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(require_permission("project", "create"))
):
    """Create a new project"""
    from decimal import Decimal
    from datetime import datetime as dt
    
    # Use current_user.id as manager if not provided
    manager_id = project_data.manager_id or current_user.id
    
    # Convert date to datetime for Beanie compatibility (date objects cause encoding issues)
    start_date_dt = None
    end_date_dt = None
    if project_data.start_date:
        if isinstance(project_data.start_date, date):
            start_date_dt = dt.combine(project_data.start_date, dt.min.time())
        else:
            start_date_dt = project_data.start_date
    if project_data.end_date:
        if isinstance(project_data.end_date, date):
            end_date_dt = dt.combine(project_data.end_date, dt.min.time())
        else:
            end_date_dt = project_data.end_date
    
    project = Project(
        name=project_data.name,
        description=project_data.description,
        work_type=project_data.work_type,
        status=project_data.status or "Planned",
        organization_id=current_user.organization_id,
        manager_id=manager_id,
        team_lead_id=project_data.team_lead_id,
        start_date=start_date_dt,
        end_date=end_date_dt,
        progress_percentage=Decimal("0.00")
    )
    await project.insert()
    
    # Assign teams to project if provided
    if project_data.team_ids:
        for team_id in project_data.team_ids:
            # Verify team exists and belongs to organization
            team = await Team.find_one(
                Team.id == team_id,
                Team.organization_id == current_user.organization_id,
                Team.deleted_at == None
            )
            
            if team:
                project_team = ProjectTeam(
                    project_id=project.id,
                    team_id=team_id
                )
                await project_team.insert()
    
    # Log audit
    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="project",
        resource_id=str(project.id),
        user_id=str(current_user.id)
    )
    
    return project


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_permission("project", "read"))
):
    """List projects with pagination and filtering (DB-level, scalable)."""
    from app.services.permission_service import PermissionService
    from app.models.team import Team, TeamMember

    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    org_id = current_user.organization_id
    base = Project.find(
        Project.organization_id == org_id,
        Project.deleted_at == None
    )

    if "CEO" in role_names:
        query = base
    elif "Manager" in role_names:
        query = base.find(Project.manager_id == current_user.id)
    elif "Team Lead" in role_names:
        led_team_ids = await Team.find(
            Team.team_lead_id == current_user.id,
            Team.deleted_at == None
        ).distinct(Team.id)
        if not led_team_ids:
            return []
        pt_list = await ProjectTeam.find(In(ProjectTeam.team_id, led_team_ids)).to_list()
        team_project_ids = list({pt.project_id for pt in pt_list})
        query = base.find(In(Project.id, team_project_ids))
    else:  # Member
        tm_list = await TeamMember.find(
            TeamMember.user_id == current_user.id,
            TeamMember.left_at == None
        ).to_list()
        user_team_ids = [tm.team_id for tm in tm_list]
        if not user_team_ids:
            return []
        pt_list = await ProjectTeam.find(In(ProjectTeam.team_id, user_team_ids)).to_list()
        team_project_ids = list({pt.project_id for pt in pt_list})
        query = base.find(In(Project.id, team_project_ids))

    if status_filter:
        query = query.find(Project.status == status_filter)

    projects = await query.sort(-Project.created_at).skip(skip).limit(limit).to_list()
    return projects


@router.get("/{project_id}/teams")
async def get_project_teams(
    project_id: str,
    current_user: User = Depends(require_permission("project", "read"))
):
    """Get teams assigned to a project"""
    # Verify project exists and user has access
    project = await Project.find_one(
        Project.id == uuid.UUID(project_id),
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get teams assigned to this project
    project_teams = await ProjectTeam.find(
        ProjectTeam.project_id == uuid.UUID(project_id)
    ).to_list()
    
    team_ids = [str(pt.team_id) for pt in project_teams]
    return team_ids


@router.get("/{project_id}/team-members")
async def get_project_team_members(
    project_id: str,
    current_user: User = Depends(require_permission("project", "read"))
):
    """Get all team members for teams assigned to a project"""
    # Verify project exists and user has access
    project = await Project.find_one(
        Project.id == uuid.UUID(project_id),
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get teams assigned to this project
    project_teams = await ProjectTeam.find(
        ProjectTeam.project_id == uuid.UUID(project_id)
    ).to_list()
    team_ids = [pt.team_id for pt in project_teams]
    if not team_ids:
        return []

    team_members = await TeamMember.find(
        In(TeamMember.team_id, team_ids),
        TeamMember.left_at == None
    ).to_list()
    member_ids = list(set(tm.user_id for tm in team_members))
    if not member_ids:
        return []

    users = await User.find(
        In(User.id, member_ids),
        User.deleted_at == None
    ).to_list()
    
    # Format response
    members = []
    for user in users:
        members.append({
            "id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "full_name": f"{user.first_name} {user.last_name}"
        })
    
    return members


@router.get("/{project_id}", response_model=ProjectWithDetails)
async def get_project(
    project_id: str,
    current_user: User = Depends(require_permission("project", "read"))
):
    """Get project by ID with details"""
    from app.services.permission_service import PermissionService
    from app.models.team import Team, TeamMember
    
    project = await Project.find_one(
        Project.id == uuid.UUID(project_id),
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check access based on role
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    has_access = False
    if "CEO" in role_names:
        has_access = True
    elif "Manager" in role_names:
        has_access = project.manager_id == current_user.id
    elif "Team Lead" in role_names:
        # Team Lead can access if:
        # 1. They are the team lead of the project, OR
        # 2. Their teams are assigned to the project
        if project.team_lead_id == current_user.id:
            has_access = True
        else:
            led_team_ids = [
                t.id for t in await Team.find(
                    Team.team_lead_id == current_user.id,
                    Team.deleted_at == None
                ).limit(500).to_list()
            ]
            if led_team_ids:
                project_teams_for_access = await ProjectTeam.find(
                    ProjectTeam.project_id == uuid.UUID(project_id)
                ).to_list()
                project_team_ids = {pt.team_id for pt in project_teams_for_access}
                has_access = any(tid in project_team_ids for tid in led_team_ids)
    else:  # Member
        user_team_members = await TeamMember.find(
            TeamMember.user_id == current_user.id,
            TeamMember.left_at == None
        ).to_list()
        user_team_ids = [tm.team_id for tm in user_team_members]
        if user_team_ids:
            all_project_teams = await ProjectTeam.find(
                ProjectTeam.project_id == uuid.UUID(project_id)
            ).to_list()
            project_team_ids = [pt.team_id for pt in all_project_teams]
            has_access = any(tid in project_team_ids for tid in user_team_ids)
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project"
        )
    
    # Get additional details
    project_uuid = uuid.UUID(project_id)
    team_count = await ProjectTeam.find(ProjectTeam.project_id == project_uuid).count()
    
    tasks = await Task.find(
        Task.project_id == project_uuid,
        Task.deleted_at == None
    ).to_list()
    
    task_count = len(tasks)
    completed_task_count = len([t for t in tasks if t.status == "Done"])
    
    # Convert to dict and add counts
    project_dict = project.dict()
    project_dict["team_count"] = team_count
    project_dict["task_count"] = task_count
    project_dict["completed_task_count"] = completed_task_count
    
    return project_dict


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: User = Depends(require_permission("project", "update"))
):
    """Update project"""
    project = await Project.find_one(
        Project.id == uuid.UUID(project_id),
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Handle team assignments separately
    team_ids = project_data.team_ids
    update_data = project_data.dict(exclude_unset=True, exclude={'team_ids'})
    
    # Update fields
    for field, value in update_data.items():
        # Convert date strings to datetime if needed
        if field in ['start_date', 'end_date'] and value:
            from datetime import datetime as dt
            if isinstance(value, date):
                value = dt.combine(value, dt.min.time())
        setattr(project, field, value)
    
    project.update_timestamp()
    
    # Calculate progress if tasks exist
    project_uuid = uuid.UUID(project_id)
    tasks = await Task.find(
        Task.project_id == project_uuid,
        Task.deleted_at == None
    ).to_list()
    
    total_tasks = len(tasks)
    if total_tasks > 0:
        completed_tasks = len([t for t in tasks if t.status == "Done"])
        project.progress_percentage = (completed_tasks / total_tasks) * 100
    
    await project.save()
    
    # Update team assignments if provided
    if team_ids is not None:
        # Remove existing team assignments
        await ProjectTeam.find(ProjectTeam.project_id == project_uuid).delete()
        
        # Add new team assignments
        for team_id in team_ids:
            # Verify team exists and belongs to organization
            team = await Team.find_one(
                Team.id == team_id,
                Team.organization_id == current_user.organization_id,
                Team.deleted_at == None
            )
            
            if team:
                project_team = ProjectTeam(
                    project_id=project.id,
                    team_id=team_id
                )
                await project_team.insert()
    
    # Log audit
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="project",
        resource_id=str(project.id),
        user_id=str(current_user.id),
        changes={"updated_fields": list(update_data.keys()) + (['team_ids'] if team_ids is not None else [])}
    )
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(require_permission("project", "delete"))
):
    """Soft delete project"""
    project = await Project.find_one(
        Project.id == uuid.UUID(project_id),
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project.soft_delete()
    await project.save()
    
    # Log audit
    audit_service = AuditService()
    await audit_service.log_action(
        action="delete",
        resource_type="project",
        resource_id=str(project.id),
        user_id=str(current_user.id)
    )
    
    return None


@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: str,
    current_user: User = Depends(require_permission("project", "update"))
):
    """Archive project (set status to Completed)"""
    project = await Project.find_one(
        Project.id == uuid.UUID(project_id),
        Project.organization_id == current_user.organization_id,
        Project.deleted_at == None
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project.status = "Completed"
    project.update_timestamp()
    await project.save()
    
    # Log audit
    audit_service = AuditService()
    await audit_service.log_action(
        action="archive",
        resource_type="project",
        resource_id=str(project.id),
        user_id=str(current_user.id)
    )
    
    return project
