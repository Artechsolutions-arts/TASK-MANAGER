from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    privacy: str = "private"
    tags: List[str] = Field(default_factory=list)
    default_task_status: str = "To Do"
    default_task_priority: str = "Medium"


class TeamCreate(TeamBase):
    team_lead_id: UUID


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    team_lead_id: Optional[UUID] = None
    privacy: Optional[str] = None
    tags: Optional[List[str]] = None
    default_task_status: Optional[str] = None
    default_task_priority: Optional[str] = None


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
    role: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: UUID
    team_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    left_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TeamWithMembers(TeamResponse):
    member_count: Optional[int] = None
    members: List[TeamMemberResponse] = []
