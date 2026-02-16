from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class TimeEntryBase(BaseModel):
    hours: Decimal
    date: date
    description: Optional[str] = None


class TimeEntryCreate(TimeEntryBase):
    project_id: UUID
    task_id: Optional[UUID] = None
    subtask_id: Optional[UUID] = None


class TimeEntryUpdate(BaseModel):
    hours: Optional[Decimal] = None
    date: Optional[date] = None
    description: Optional[str] = None


class TimeEntryResponse(TimeEntryBase):
    id: UUID
    user_id: UUID
    project_id: UUID
    task_id: Optional[UUID] = None
    subtask_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
