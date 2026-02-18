from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class AttachmentCreate(BaseModel):
    file_name: str
    file_type: str
    file_data: str  # Base64
    file_size: int


class AttachmentResponse(AttachmentCreate):
    id: UUID
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime


class ProjectBase(BaseModel):
    name: str
    company_name: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    work_type: Optional[str] = None
    category: Optional[str] = None
    status: str = "Planned"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    labels: List[str] = Field(default_factory=list)
    url: Optional[str] = None


class ProjectCreate(ProjectBase):
    manager_id: Optional[UUID] = None  # If not provided, will use current_user.id
    team_lead_id: Optional[UUID] = None
    team_ids: Optional[List[UUID]] = None
    reported_by_id: Optional[UUID] = None
    budget: Optional[Decimal] = None
    attachments: Optional[List[AttachmentCreate]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    work_type: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    manager_id: Optional[UUID] = None
    reported_by_id: Optional[UUID] = None
    team_lead_id: Optional[UUID] = None
    team_ids: Optional[List[UUID]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    labels: Optional[List[str]] = None
    url: Optional[str] = None
    budget: Optional[Decimal] = None
    attachments: Optional[List[AttachmentCreate]] = None


class ProjectResponse(ProjectBase):
    id: UUID
    organization_id: UUID
    manager_id: UUID
    reported_by_id: Optional[UUID] = None
    team_lead_id: Optional[UUID] = None
    progress_percentage: Decimal
    budget: Optional[Decimal] = None
    attachments: List[AttachmentResponse] = []
    original_estimated_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectWithDetails(ProjectResponse):
    team_count: Optional[int] = None
    task_count: Optional[int] = None
    completed_task_count: Optional[int] = None
