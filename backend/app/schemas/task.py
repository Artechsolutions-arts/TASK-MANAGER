from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "Backlog"
    priority: str = "Medium"
    due_date: Optional[date] = None


class EpicCreate(TaskBase):
    project_id: UUID
    assignee_id: Optional[UUID] = None
    reporter_id: UUID


class EpicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[date] = None


class EpicResponse(TaskBase):
    id: UUID
    project_id: UUID
    assignee_id: Optional[UUID] = None
    reporter_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class StoryCreate(TaskBase):
    epic_id: UUID
    assignee_id: Optional[UUID] = None
    reporter_id: UUID
    estimated_hours: Optional[Decimal] = None


class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None


class StoryResponse(TaskBase):
    id: UUID
    epic_id: UUID
    assignee_id: Optional[UUID] = None
    reporter_id: UUID
    estimated_hours: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaskCreate(TaskBase):
    project_id: UUID
    story_id: Optional[UUID] = None
    sprint_id: Optional[UUID] = None  # Optional sprint assignment
    assignee_id: Optional[UUID] = None
    reporter_id: Optional[UUID] = None  # Will default to current_user.id in endpoint
    estimated_hours: Optional[Decimal] = None
    story_points: Optional[Decimal] = None  # Story points for sprint planning
    position: Optional[int] = None

    class Config:
        json_encoders = {
            Decimal: str
        }


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    sprint_id: Optional[UUID] = None  # Optional sprint assignment
    assignee_id: Optional[UUID] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None
    story_points: Optional[Decimal] = None  # Story points for sprint planning
    position: Optional[int] = None


class TaskResponse(TaskBase):
    id: UUID
    project_id: UUID
    story_id: Optional[UUID] = None
    sprint_id: Optional[UUID] = None  # Optional sprint assignment
    assignee_id: Optional[UUID] = None
    reporter_id: UUID
    estimated_hours: Optional[Decimal] = None
    story_points: Optional[Decimal] = None  # Story points for sprint planning
    position: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SubtaskCreate(TaskBase):
    task_id: UUID
    assignee_id: Optional[UUID] = None
    reporter_id: UUID
    estimated_hours: Optional[Decimal] = None


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None
    is_completed: Optional[bool] = None


class SubtaskResponse(TaskBase):
    id: UUID
    task_id: UUID
    assignee_id: Optional[UUID] = None
    reporter_id: UUID
    estimated_hours: Optional[Decimal] = None
    is_completed: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
