from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None


class TeamCreate(TeamBase):
    team_lead_id: UUID


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    team_lead_id: Optional[UUID] = None


class TeamResponse(TeamBase):
    id: UUID
    organization_id: UUID
    team_lead_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TeamMemberCreate(BaseModel):
    user_id: UUID


class TeamMemberResponse(BaseModel):
    id: UUID
    team_id: UUID
    user_id: UUID
    joined_at: datetime
    left_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TeamWithMembers(TeamResponse):
    member_count: Optional[int] = None
    members: List[TeamMemberResponse] = []
