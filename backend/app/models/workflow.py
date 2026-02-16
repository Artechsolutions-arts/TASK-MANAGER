from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from pydantic import Field
from app.models.base import BaseModel, SoftDeleteMixin


class WorkflowTransition(BaseModel):
    """Workflow transition definition"""
    from_status: str
    to_status: str
    allowed_roles: List[str] = Field(default_factory=list)  # List of role names


class Workflow(BaseModel, SoftDeleteMixin):
    """Custom workflow model for MongoDB"""
    
    project_id: uuid.UUID
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    statuses: List[str] = Field(default_factory=list)  # List of status names
    transitions: List[WorkflowTransition] = Field(default_factory=list)
    is_default: bool = Field(default=False)  # Whether this is the default workflow
    created_by: uuid.UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "workflows"
        indexes = [
            [("project_id", 1)],
            [("project_id", 1), ("is_default", 1)],
            [("deleted_at", 1)],
        ]
