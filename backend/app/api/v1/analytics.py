from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime, timedelta, date
from decimal import Decimal
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.project import Project, ProjectTeam
from app.models.task import Task
from app.models.time_tracking import TimeEntry
from app.models.team import Team, TeamMember
from app.schemas.analytics import DashboardResponse, WorkloadResponse, BurndownData
from app.services.permission_service import PermissionService
from beanie.operators import In
import uuid

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    role: str = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get role-specific dashboard data"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    # Determine effective role
    effective_role = role or (role_names[0] if role_names else "Member")
    
    # Get projects based on role
    if effective_role == "CEO":
        projects = await Project.find(
            Project.organization_id == current_user.organization_id,
            Project.deleted_at == None
        ).to_list()
    elif effective_role == "Manager":
        # Projects where user is manager
        projects = await Project.find(
            Project.organization_id == current_user.organization_id,
            Project.manager_id == current_user.id,
            Project.deleted_at == None
        ).to_list()
    elif effective_role == "Team Lead":
        led_team_ids = [
            t.id for t in await Team.find(
                Team.team_lead_id == current_user.id,
                Team.deleted_at == None
            ).limit(500).to_list()
        ]
        if led_team_ids:
            pt_list = await ProjectTeam.find(In(ProjectTeam.team_id, led_team_ids)).to_list()
            team_project_ids = list({pt.project_id for pt in pt_list})
            projects = await Project.find(
                In(Project.id, team_project_ids),
                Project.organization_id == current_user.organization_id,
                Project.deleted_at == None
            ).to_list()
        else:
            projects = []
    else:  # Member
        user_team_members = await TeamMember.find(
            TeamMember.user_id == current_user.id,
            TeamMember.left_at == None
        ).to_list()
        user_team_ids = [tm.team_id for tm in user_team_members]
        if user_team_ids:
            pt_list = await ProjectTeam.find(In(ProjectTeam.team_id, user_team_ids)).to_list()
            team_project_ids = list({pt.project_id for pt in pt_list})
            projects = await Project.find(
                In(Project.id, team_project_ids),
                Project.organization_id == current_user.organization_id,
                Project.deleted_at == None
            ).to_list()
        else:
            projects = []
    
    project_ids = [p.id for p in projects]
    
    # Calculate metrics
    total_projects = len(projects)
    active_projects = len([p for p in projects if p.status == "In Progress"])
    
    # Get tasks (DB-level filter)
    if project_ids:
        task_query = Task.find(
            In(Task.project_id, project_ids),
            Task.deleted_at == None
        )
        if effective_role == "Member":
            task_query = task_query.find(Task.assignee_id == current_user.id)
        elif effective_role == "Team Lead":
            task_query = task_query.find(Task.reporter_id == current_user.id)
        tasks = await task_query.to_list()
    else:
        tasks = []
    
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "Done"])
    
    # Team members count
    if effective_role in ["CEO", "Manager"]:
        team_members = await User.find(
            User.organization_id == current_user.organization_id,
            User.deleted_at == None
        ).count()
    elif effective_role == "Team Lead":
        led_team_ids = [
            t.id for t in await Team.find(
                Team.team_lead_id == current_user.id,
                Team.deleted_at == None
            ).limit(500).to_list()
        ]
        if led_team_ids:
            team_members_list = await TeamMember.find(
                In(TeamMember.team_id, led_team_ids),
                TeamMember.left_at == None
            ).to_list()
            team_members = len(set(tm.user_id for tm in team_members_list))
        else:
            team_members = 0
    else:
        team_members = 1
    
    # Workload data
    workload_data = []
    if effective_role in ["CEO", "Manager", "Team Lead"]:
        # Get workload for team members
        users_query = User.find(
            User.organization_id == current_user.organization_id,
            User.deleted_at == None
        )
        
        if effective_role == "Team Lead":
            led_team_ids = [
                t.id for t in await Team.find(
                    Team.team_lead_id == current_user.id,
                    Team.deleted_at == None
                ).limit(500).to_list()
            ]
            if led_team_ids:
                team_members_list = await TeamMember.find(
                    In(TeamMember.team_id, led_team_ids),
                    TeamMember.left_at == None
                ).to_list()
                member_user_ids = list(set(tm.user_id for tm in team_members_list))
                users = await User.find(
                    In(User.id, member_user_ids),
                    User.organization_id == current_user.organization_id,
                    User.deleted_at == None
                ).limit(10).to_list()
            else:
                users = []
        if effective_role != "Team Lead":
            users = await users_query.limit(10).to_list()
        # For Team Lead, users is already set above
        
        for user in users:
            user_tasks = await Task.find(
                Task.assignee_id == user.id,
                Task.deleted_at == None
            ).to_list()
            
            time_entries = await TimeEntry.find(
                TimeEntry.user_id == user.id,
                TimeEntry.deleted_at == None
            ).to_list()
            
            total_hours = sum([float(te.hours) for te in time_entries])
            
            # Compare datetime due_date with today's date (convert datetime to date for comparison)
            today = datetime.now().date()
            overdue_tasks = [t for t in user_tasks if t.due_date and (t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date) < today and t.status != "Done"]
            
            workload_data.append({
                "user_id": str(user.id),
                "user_name": f"{user.first_name} {user.last_name}",
                "total_hours": total_hours,
                "task_count": len(user_tasks),
                "completed_task_count": len([t for t in user_tasks if t.status == "Done"]),
                "overdue_task_count": len(overdue_tasks)
            })
    else:
        # Member's own workload
        user_tasks = await Task.find(
            Task.assignee_id == current_user.id,
            Task.deleted_at == None
        ).to_list()
        
        time_entries = await TimeEntry.find(
            TimeEntry.user_id == current_user.id,
            TimeEntry.deleted_at == None
        ).to_list()
        
        total_hours = sum([float(te.hours) for te in time_entries])
        
        # Compare datetime due_date with today's date (convert datetime to date for comparison)
        today = datetime.now().date()
        overdue_tasks = [t for t in user_tasks if t.due_date and (t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date) < today and t.status != "Done"]
        
        workload_data.append({
            "user_id": str(current_user.id),
            "user_name": f"{current_user.first_name} {current_user.last_name}",
            "total_hours": total_hours,
            "task_count": len(user_tasks),
            "completed_task_count": len([t for t in user_tasks if t.status == "Done"]),
            "overdue_task_count": len(overdue_tasks)
        })
    
    # Recent activities (simplified - would use audit logs in production)
    recent_activities = []
    
    return DashboardResponse(
        total_projects=total_projects,
        active_projects=active_projects,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        team_members=team_members,
        workload_data=workload_data,
        recent_activities=recent_activities
    )


@router.get("/workload", response_model=List[WorkloadResponse])
async def get_workload(
    team_id: str = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get workload data for users"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if "CEO" not in role_names and "Manager" not in role_names and "Team Lead" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Get users based on role and team
    if team_id:
        from app.models.team import TeamMember as TM
        team_members_list = await TM.find(
            TM.team_id == uuid.UUID(team_id),
            TM.left_at == None
        ).to_list()
        user_ids = [tm.user_id for tm in team_members_list]
        all_org_users = await User.find(
            User.organization_id == current_user.organization_id,
            User.deleted_at == None
        ).to_list()
        users = [u for u in all_org_users if u.id in user_ids]
    else:
        users = await User.find(
            User.organization_id == current_user.organization_id,
            User.deleted_at == None
        ).to_list()
    
    workloads = []
    for user in users:
        user_tasks = await Task.find(
            Task.assignee_id == user.id,
            Task.deleted_at == None
        ).to_list()
        
        time_entries = await TimeEntry.find(
            TimeEntry.user_id == user.id,
            TimeEntry.deleted_at == None
        ).to_list()
        
        total_hours = sum([float(te.hours) for te in time_entries])
        
        # Compare datetime due_date with today's date (convert datetime to date for comparison)
        today = datetime.now().date()
        overdue_tasks = [t for t in user_tasks if t.due_date and (t.due_date.date() if isinstance(t.due_date, datetime) else t.due_date) < today and t.status != "Done"]
        
        workloads.append(WorkloadResponse(
            user_id=user.id,
            user_name=f"{user.first_name} {user.last_name}",
            total_hours=total_hours,
            task_count=len(user_tasks),
            completed_task_count=len([t for t in user_tasks if t.status == "Done"]),
            overdue_task_count=len(overdue_tasks)
        ))
    
    return workloads


@router.get("/burndown/{project_id}", response_model=List[BurndownData])
async def get_burndown_chart(
    project_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get burndown chart data for a project"""
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
    
    # Get all tasks for project
    tasks = await Task.find(
        Task.project_id == uuid.UUID(project_id),
        Task.deleted_at == None
    ).to_list()
    
    total_estimated_hours = sum(
        float(task.estimated_hours) for task in tasks if task.estimated_hours
    )
    
    # Generate daily data for last 30 days
    burndown_data = []
    today = date.today()
    
    for i in range(30):
        chart_date = today - timedelta(days=30 - i)
        
        # Calculate planned hours (linear burndown)
        planned_hours = total_estimated_hours * (1 - (i / 30))
        
        # Calculate actual hours logged up to this date
        time_entries = await TimeEntry.find(
            TimeEntry.project_id == uuid.UUID(project_id),
            TimeEntry.date <= chart_date,
            TimeEntry.deleted_at == None
        ).to_list()
        
        actual_hours = sum([float(te.hours) for te in time_entries])
        
        # Calculate remaining hours
        remaining_hours = total_estimated_hours - actual_hours
        
        burndown_data.append(BurndownData(
            date=chart_date,
            planned_hours=planned_hours,
            actual_hours=actual_hours,
            remaining_hours=remaining_hours
        ))
    
    return burndown_data
