from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import Field, field_validator
from bson.decimal128 import Decimal128
import uuid
from app.models.base import BaseModel, SoftDeleteMixin
from app.models.attachment import Attachment


class Project(BaseModel, SoftDeleteMixin):
    """Project model for MongoDB"""
    
    name: str = Field(..., max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = Field(None, max_length=2000)
    description: Optional[str] = Field(None, max_length=5000)
    work_type: Optional[str] = Field(None, max_length=255)  # e.g. App Development, Website, Marketing, etc.
    category: Optional[str] = Field(None, max_length=255)
    status: str = Field(default="Planned", max_length=50)  # Planned, In Progress, Blocked, Completed
    organization_id: uuid.UUID
    manager_id: uuid.UUID
    reported_by_id: Optional[uuid.UUID] = None
    team_lead_id: Optional[uuid.UUID] = None
    start_date: Optional[datetime] = None  # Using datetime for Beanie compatibility
    end_date: Optional[datetime] = None  # Using datetime for Beanie compatibility
    progress_percentage: Decimal = Field(default=Decimal("0.00"))
    labels: List[str] = Field(default_factory=list)
    url: Optional[str] = Field(None, max_length=2048)
    budget: Optional[Decimal] = None
    attachments: List[Attachment] = Field(default_factory=list)
    
    @field_validator('progress_percentage', mode='before')
    @classmethod
    def convert_decimal128(cls, v):
        """Convert Decimal128 from MongoDB to Python Decimal"""
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v

    @field_validator('budget', mode='before')
    @classmethod
    def convert_decimal128_budget(cls, v):
        if v is None:
            return None
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    class Settings:
        name = "projects"
        indexes = [
            [("organization_id", 1)],
            [("manager_id", 1)],
            [("team_lead_id", 1)],
            [("status", 1)],
            [("deleted_at", 1)],
            [("organization_id", 1), ("deleted_at", 1)],
            [("organization_id", 1), ("manager_id", 1), ("deleted_at", 1)],
            [("organization_id", 1), ("status", 1), ("deleted_at", 1)],
        ]


class ProjectTeam(BaseModel):
    """Project-Team junction model for MongoDB"""
    
    project_id: uuid.UUID
    team_id: uuid.UUID
    
    class Settings:
        name = "project_teams"
        indexes = [
            [("project_id", 1), ("team_id", 1)],  # Unique compound index
            [("project_id", 1)],
            [("team_id", 1)],
        ]
