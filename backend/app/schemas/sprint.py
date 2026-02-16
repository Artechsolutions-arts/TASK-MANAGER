from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class SprintCreate(BaseModel):
    name: str
    project_id: UUID
    start_date: datetime
    end_date: datetime
    goal: Optional[str] = None
    committed_story_points: Optional[Decimal] = Decimal("0.00")


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    goal: Optional[str] = None
    committed_story_points: Optional[Decimal] = None


class SprintResponse(BaseModel):
    id: UUID
    name: str
    project_id: UUID
    start_date: datetime
    end_date: datetime
    goal: Optional[str] = None
    status: str
    committed_story_points: Decimal
    completed_story_points: Decimal
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SprintSummary(BaseModel):
    """Sprint summary with progress"""
    sprint: SprintResponse
    total_tasks: int
    completed_tasks: int
    progress_percentage: float
    story_points_progress: float
