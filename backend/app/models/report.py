from typing import Optional, List
from datetime import datetime
from pydantic import Field, BaseModel as PydanticBaseModel
import uuid
from app.models.base import BaseModel, SoftDeleteMixin


class ReportAttachment(PydanticBaseModel):
    """Attachment model for reports"""
    file_name: str
    file_type: str  # MIME type (e.g., 'image/png', 'application/pdf')
    file_data: str  # Base64 encoded file data
    file_size: int  # File size in bytes


class Report(BaseModel, SoftDeleteMixin):
    """Report model for MongoDB"""
    
    user_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    task_id: Optional[uuid.UUID] = None
    report_type: str = Field(..., max_length=50)  # 'task', 'project', 'weekly', 'monthly'
    status: str = Field(default='draft', max_length=20)  # 'draft', 'submitted', 'reviewed'
    content: str
    progress_percentage: Optional[int] = None
    submitted_to: Optional[uuid.UUID] = None  # Supervisor ID
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    attachments: List[ReportAttachment] = Field(default_factory=list)  # List of file attachments
    
    class Settings:
        name = "reports"
        indexes = [
            [("user_id", 1)],
            [("project_id", 1)],
            [("task_id", 1)],
            [("status", 1)],
            [("report_type", 1)],
            [("submitted_to", 1)],
        ]
