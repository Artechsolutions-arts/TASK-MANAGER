from typing import Optional
from datetime import datetime
from pydantic import Field
import uuid
from app.models.base import BaseModel, SoftDeleteMixin


class Team(BaseModel, SoftDeleteMixin):
    """Team model for MongoDB"""
    
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    organization_id: uuid.UUID
    team_lead_id: uuid.UUID
    
    class Settings:
        name = "teams"
        indexes = [
            [("organization_id", 1)],
            [("team_lead_id", 1)],
            [("deleted_at", 1)],
        ]


class TeamMember(BaseModel):
    """Team member junction model for MongoDB"""
    
    team_id: uuid.UUID
    user_id: uuid.UUID
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    left_at: Optional[datetime] = None
    
    class Settings:
        name = "team_members"
        indexes = [
            [("team_id", 1), ("user_id", 1)],  # Unique compound index
            [("team_id", 1)],
            [("user_id", 1)],
        ]
