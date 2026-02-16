from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.models.team import Team, TeamMember
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse, TeamWithMembers, TeamMemberCreate, TeamMemberResponse
from app.services.audit_service import AuditService
from datetime import datetime
import uuid

router = APIRouter()


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(require_permission("team", "create"))
):
    """Create a new team"""
    team = Team(
        name=team_data.name,
        description=team_data.description,
        organization_id=current_user.organization_id,
        team_lead_id=team_data.team_lead_id
    )
    await team.insert()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="team",
        resource_id=str(team.id),
        user_id=str(current_user.id)
    )
    
    return team


@router.get("", response_model=List[TeamResponse])
async def list_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_permission("team", "read"))
):
    """List teams"""
    teams = await Team.find(
        Team.organization_id == current_user.organization_id,
        Team.deleted_at == None
    ).sort(-Team.created_at).skip(skip).limit(limit).to_list()
    
    return teams


@router.get("/{team_id}", response_model=TeamWithMembers)
async def get_team(
    team_id: str,
    current_user: User = Depends(require_permission("team", "read"))
):
    """Get team by ID with members"""
    team = await Team.find_one(
        Team.id == uuid.UUID(team_id),
        Team.organization_id == current_user.organization_id,
        Team.deleted_at == None
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    members = await TeamMember.find(
        TeamMember.team_id == uuid.UUID(team_id),
        TeamMember.left_at == None
    ).to_list()
    
    team_dict = team.dict()
    team_dict["member_count"] = len(members)
    team_dict["members"] = members
    
    return team_dict


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    team_data: TeamUpdate,
    current_user: User = Depends(require_permission("team", "update"))
):
    """Update team"""
    team = await Team.find_one(
        Team.id == uuid.UUID(team_id),
        Team.organization_id == current_user.organization_id,
        Team.deleted_at == None
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    update_data = team_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)
    
    team.update_timestamp()
    await team.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="team",
        resource_id=str(team.id),
        user_id=str(current_user.id)
    )
    
    return team


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    current_user: User = Depends(require_permission("team", "delete"))
):
    """Soft delete team"""
    team = await Team.find_one(
        Team.id == uuid.UUID(team_id),
        Team.organization_id == current_user.organization_id,
        Team.deleted_at == None
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    team.soft_delete()
    await team.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="delete",
        resource_type="team",
        resource_id=str(team.id),
        user_id=str(current_user.id)
    )
    
    return None


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    member_data: TeamMemberCreate,
    current_user: User = Depends(require_permission("team", "update"))
):
    """Add member to team"""
    team = await Team.find_one(
        Team.id == uuid.UUID(team_id),
        Team.organization_id == current_user.organization_id,
        Team.deleted_at == None
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Check if member already exists
    existing = await TeamMember.find_one(
        TeamMember.team_id == uuid.UUID(team_id),
        TeamMember.user_id == member_data.user_id,
        TeamMember.left_at == None
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team"
        )
    
    member = TeamMember(
        team_id=uuid.UUID(team_id),
        user_id=member_data.user_id
    )
    await member.insert()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="add_member",
        resource_type="team",
        resource_id=str(team.id),
        user_id=str(current_user.id)
    )
    
    return member


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: User = Depends(require_permission("team", "update"))
):
    """Remove member from team"""
    team = await Team.find_one(
        Team.id == uuid.UUID(team_id),
        Team.organization_id == current_user.organization_id,
        Team.deleted_at == None
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    member = await TeamMember.find_one(
        TeamMember.team_id == uuid.UUID(team_id),
        TeamMember.user_id == uuid.UUID(user_id),
        TeamMember.left_at == None
    )
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in team"
        )
    
    member.left_at = datetime.utcnow()
    member.update_timestamp()
    await member.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="remove_member",
        resource_type="team",
        resource_id=str(team.id),
        user_id=str(current_user.id)
    )
    
    return None
