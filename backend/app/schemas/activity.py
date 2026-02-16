from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class ActivityBase(BaseModel):
    entity_type: str = Field(..., max_length=50)
    entity_id: uuid.UUID
    activity_type: str = Field(..., max_length=50)
    content: Optional[str] = Field(None, max_length=10000)
    action: Optional[str] = Field(None, max_length=100)
    field_name: Optional[str] = Field(None, max_length=100)
    old_value: Optional[str] = Field(None, max_length=500)
    new_value: Optional[str] = Field(None, max_length=500)
    hours: Optional[float] = None
    work_date: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ActivityCreate(ActivityBase):
    """Schema for creating a new activity (comment or work log)"""
    pass


class ActivityResponse(ActivityBase):
    """Schema for activity response"""
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ActivityListResponse(BaseModel):
    """Schema for activity list with pagination"""
    items: list[ActivityResponse]
    total: int
    skip: int
    limit: int
