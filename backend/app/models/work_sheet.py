from datetime import datetime, date
from typing import Optional
from beanie import Document
from pydantic import Field
import uuid


class WorkSheet(Document):
    """Work Sheet model for daily work logging"""
    
    sheet_name: str = Field(..., description="Sheet name (e.g., month name like 'January', 'February')")
    task_id: str = Field(..., description="Task identifier (e.g., TSK001)")
    task_name: str = Field(..., description="Name/description of the task")
    assigned_to: uuid.UUID = Field(..., description="User ID of the person assigned to this task")
    start_date: Optional[datetime] = Field(None, description="Task start date")
    due_date: Optional[datetime] = Field(None, description="Task due date")
    status: str = Field(default="IN-PROGRESS", description="Task status")
    completion_percentage: Optional[int] = Field(None, ge=0, le=100, description="Completion percentage")
    notes: Optional[str] = Field(None, description="Additional notes")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "work_sheets"
        indexes = [
            "assigned_to",
            "sheet_name",
            "due_date",
            "status",
            ("assigned_to", "sheet_name"),
            ("assigned_to", "sheet_name", "due_date"),
        ]
