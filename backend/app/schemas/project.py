from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    work_type: Optional[str] = None
    status: str = "Planned"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    manager_id: Optional[UUID] = None  # If not provided, will use current_user.id
    team_lead_id: Optional[UUID] = None
    team_ids: Optional[List[UUID]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    work_type: Optional[str] = None
    status: Optional[str] = None
    manager_id: Optional[UUID] = None
    team_lead_id: Optional[UUID] = None
    team_ids: Optional[List[UUID]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectResponse(ProjectBase):
    id: UUID
    organization_id: UUID
    manager_id: UUID
    team_lead_id: Optional[UUID] = None
    progress_percentage: Decimal
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectWithDetails(ProjectResponse):
    team_count: Optional[int] = None
    task_count: Optional[int] = None
    completed_task_count: Optional[int] = None
