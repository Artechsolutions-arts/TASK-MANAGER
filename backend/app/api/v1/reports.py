from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime
from app.core.dependencies import get_current_active_user
from app.models.user import User, UserRole, Role
from app.models.report import Report
from app.models.project import Project
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.services.permission_service import PermissionService
from pydantic import BaseModel
from uuid import UUID
import uuid

router = APIRouter()


# Schemas
class AttachmentCreate(BaseModel):
    file_name: str
    file_type: str  # MIME type
    file_data: str  # Base64 encoded
    file_size: int


class ReportCreate(BaseModel):
    project_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    report_type: str  # 'task', 'project', 'weekly', 'monthly'
    content: str
    progress_percentage: Optional[int] = None
    attachments: Optional[List[AttachmentCreate]] = None

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    file_name: str
    file_type: str
    file_data: str  # Base64 encoded
    file_size: int


class ReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    report_type: str
    status: str
    content: str
    progress_percentage: Optional[int] = None
    submitted_to: Optional[UUID] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    project_name: Optional[str] = None
    task_title: Optional[str] = None
    attachments: Optional[List[AttachmentResponse]] = None

    class Config:
        from_attributes = True


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new report"""
    # Verify project exists if provided
    if report_data.project_id:
        project = await Project.find_one(
            Project.id == report_data.project_id,
            Project.organization_id == current_user.organization_id,
            Project.deleted_at == None
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
    
    # Verify task exists if provided
    if report_data.task_id:
        task = await Task.find_one(
            Task.id == report_data.task_id,
            Task.deleted_at == None
        )
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
    
    # Determine supervisor based on user role
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    submitted_to = None
    if "Member" in role_names:
        # Member submits to Team Lead - find team lead from team membership
        team_membership = await TeamMember.find_one(
            TeamMember.user_id == current_user.id,
            TeamMember.left_at == None
        )
        if team_membership:
            team = await Team.find_one(Team.id == team_membership.team_id)
            if team:
                submitted_to = team.team_lead_id
    elif "Team Lead" in role_names:
        # Team Lead submits to Manager - find manager from projects
        if report_data.project_id:
            project = await Project.find_one(Project.id == report_data.project_id)
            if project:
                submitted_to = project.manager_id
    elif "Manager" in role_names:
        # Manager submits to CEO - find CEO in organization
        ceo_role = await Role.find_one(Role.name == "CEO")
        if ceo_role:
            ceo_user_role = await UserRole.find_one(
                UserRole.role_id == ceo_role.id,
                UserRole.scope_type == "organization"
            )
            if ceo_user_role:
                submitted_to = ceo_user_role.user_id
    
    # Create report
    report = Report(
        user_id=current_user.id,
        project_id=report_data.project_id,
        task_id=report_data.task_id,
        report_type=report_data.report_type,
        content=report_data.content,
        progress_percentage=report_data.progress_percentage,
        submitted_to=submitted_to,
        status='submitted' if submitted_to else 'draft',
        submitted_at=datetime.utcnow() if submitted_to else None
    )
    await report.insert()
    
    # Get related data for response
    user_name = f"{current_user.first_name} {current_user.last_name}"
    project_name = None
    if report.project_id:
        project = await Project.find_one(Project.id == report.project_id)
        if project:
            project_name = project.name
    
    task_title = None
    if report.task_id:
        task = await Task.find_one(Task.id == report.task_id)
        if task:
            task_title = task.title
    
    # Convert attachments for response
    attachment_responses = None
    if report.attachments:
        attachment_responses = [
            AttachmentResponse(
                file_name=att.file_name,
                file_type=att.file_type,
                file_data=att.file_data,
                file_size=att.file_size
            )
            for att in report.attachments
        ]
    
    return ReportResponse(
        id=report.id,
        user_id=report.user_id,
        project_id=report.project_id,
        task_id=report.task_id,
        report_type=report.report_type,
        status=report.status,
        content=report.content,
        progress_percentage=report.progress_percentage,
        submitted_to=report.submitted_to,
        submitted_at=report.submitted_at,
        reviewed_at=report.reviewed_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
        user_name=user_name,
        project_name=project_name,
        task_title=task_title,
        attachments=attachment_responses
    )


@router.get("", response_model=List[ReportResponse])
async def list_reports(
    project_id: Optional[str] = Query(None),
    task_id: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user)
):
    """List reports based on user role"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    # Build query based on role
    user_ids_to_filter = None
    
    if "CEO" in role_names:
        # CEO views reports from managers
        manager_role = await Role.find_one(Role.name == "Manager")
        if manager_role:
            manager_user_roles = await UserRole.find(
                UserRole.role_id == manager_role.id
            ).to_list()
            user_ids_to_filter = [ur.user_id for ur in manager_user_roles]
    elif "Manager" in role_names:
        # Manager views reports from team leads
        team_lead_role = await Role.find_one(Role.name == "Team Lead")
        if team_lead_role:
            team_lead_user_roles = await UserRole.find(
                UserRole.role_id == team_lead_role.id
            ).to_list()
            user_ids_to_filter = [ur.user_id for ur in team_lead_user_roles]
    elif "Team Lead" in role_names:
        # Team Lead views reports from their team members
        led_teams = await Team.find(
            Team.team_lead_id == current_user.id,
            Team.deleted_at == None
        ).to_list()
        team_ids = [t.id for t in led_teams]
        if team_ids:
            all_team_members = await TeamMember.find(TeamMember.left_at == None).to_list()
            team_members = [tm for tm in all_team_members if tm.team_id in team_ids]
            user_ids_to_filter = [tm.user_id for tm in team_members]
    else:
        # Member views only their own reports
        user_ids_to_filter = [current_user.id]
    
    # Build query
    all_reports = await Report.find(Report.deleted_at == None).to_list()
    
    if user_ids_to_filter:
        reports = [r for r in all_reports if r.user_id in user_ids_to_filter]
    else:
        reports = []
    
    # Apply filters
    if project_id:
        project_uuid = uuid.UUID(project_id)
        reports = [r for r in reports if r.project_id == project_uuid]
    if task_id:
        task_uuid = uuid.UUID(task_id)
        reports = [r for r in reports if r.task_id == task_uuid]
    if report_type:
        reports = [r for r in reports if r.report_type == report_type]
    if status_filter:
        reports = [r for r in reports if r.status == status_filter]
    
    # Sort by created_at descending
    reports.sort(key=lambda x: x.created_at, reverse=True)
    
    # Enrich with related data
    result = []
    for report in reports:
        user = await User.find_one(User.id == report.user_id)
        user_name = f"{user.first_name} {user.last_name}" if user else "Unknown"
        
        project_name = None
        if report.project_id:
            project = await Project.find_one(Project.id == report.project_id)
            if project:
                project_name = project.name
        
        task_title = None
        if report.task_id:
            task = await Task.find_one(Task.id == report.task_id)
            if task:
                task_title = task.title
        
        # Convert attachments for response
        attachment_responses = None
        if report.attachments:
            attachment_responses = [
                AttachmentResponse(
                    file_name=att.file_name,
                    file_type=att.file_type,
                    file_data=att.file_data,
                    file_size=att.file_size
                )
                for att in report.attachments
            ]
        
        result.append(ReportResponse(
            id=report.id,
            user_id=report.user_id,
            project_id=report.project_id,
            task_id=report.task_id,
            report_type=report.report_type,
            status=report.status,
            content=report.content,
            progress_percentage=report.progress_percentage,
            submitted_to=report.submitted_to,
            submitted_at=report.submitted_at,
            reviewed_at=report.reviewed_at,
            created_at=report.created_at,
            updated_at=report.updated_at,
            user_name=user_name,
            project_name=project_name,
            task_title=task_title,
            attachments=attachment_responses
        ))
    
    return result


@router.post("/{report_id}/submit", response_model=ReportResponse)
async def submit_report(
    report_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Submit a draft report"""
    report = await Report.find_one(
        Report.id == uuid.UUID(report_id),
        Report.user_id == current_user.id,
        Report.deleted_at == None
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    if report.status == 'submitted':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report already submitted"
        )
    
    # Determine supervisor if not already set
    if not report.submitted_to:
        permission_service = PermissionService()
        user_roles = await permission_service.get_user_roles(str(current_user.id))
        role_names = [r["role_name"] for r in user_roles]
        
        if "Member" in role_names:
            team_membership = await TeamMember.find_one(
                TeamMember.user_id == current_user.id,
                TeamMember.left_at == None
            )
            if team_membership:
                team = await Team.find_one(Team.id == team_membership.team_id)
                if team:
                    report.submitted_to = team.team_lead_id
        elif "Team Lead" in role_names:
            if report.project_id:
                project = await Project.find_one(Project.id == report.project_id)
                if project:
                    report.submitted_to = project.manager_id
        elif "Manager" in role_names:
            ceo_role = await Role.find_one(Role.name == "CEO")
            if ceo_role:
                ceo_user_role = await UserRole.find_one(
                    UserRole.role_id == ceo_role.id,
                    UserRole.scope_type == "organization"
                )
                if ceo_user_role:
                    report.submitted_to = ceo_user_role.user_id
    
    report.status = 'submitted'
    report.submitted_at = datetime.utcnow()
    report.update_timestamp()
    await report.save()
    
    return report
