from typing import Optional, Dict, Any
from pydantic import Field
import uuid
from app.models.base import BaseModel


class AuditLog(BaseModel):
    """Audit log model for MongoDB"""
    
    user_id: Optional[uuid.UUID] = None
    action: str = Field(..., max_length=50)  # create, update, delete, login, etc.
    resource_type: str = Field(..., max_length=50)  # project, task, user, etc.
    resource_id: uuid.UUID
    changes: Optional[Dict[str, Any]] = None  # Before/after changes for updates
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = Field(None, max_length=500)
    
    class Settings:
        name = "audit_logs"
        indexes = [
            [("user_id", 1)],
            [("resource_type", 1), ("resource_id", 1)],
            [("action", 1)],
            [("created_at", 1)],
        ]
