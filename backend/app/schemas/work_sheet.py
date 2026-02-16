from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class WorkSheetCreate(BaseModel):
    """Schema for creating a work sheet entry"""
    sheet_name: str = Field(..., description="Sheet name (e.g., month name)")
    task_id: str = Field(..., description="Task identifier")
    task_name: str = Field(..., description="Task name/description")
    start_date: Optional[str] = None  # Accept string dates from frontend
    due_date: Optional[str] = None  # Accept string dates from frontend
    status: str = Field(default="IN-PROGRESS", description="Task status")
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None


class WorkSheetUpdate(BaseModel):
    """Schema for updating a work sheet entry"""
    task_name: Optional[str] = None
    start_date: Optional[str] = None  # Accept string dates from frontend
    due_date: Optional[str] = None  # Accept string dates from frontend
    status: Optional[str] = None
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None


class WorkSheetResponse(BaseModel):
    """Schema for work sheet response"""
    id: str
    sheet_name: str
    task_id: str
    task_name: str
    assigned_to: uuid.UUID
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    status: str
    completion_percentage: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
