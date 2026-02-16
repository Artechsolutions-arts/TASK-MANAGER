from datetime import datetime
from pydantic import Field
import uuid
from app.models.base import BaseModel


class TaskDependency(BaseModel):
    """Task dependency model for MongoDB"""
    
    task_id: uuid.UUID
    depends_on_task_id: uuid.UUID
    type: str = Field(default="blocks", max_length=50)  # blocks, relates_to
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "task_dependencies"
        indexes = [
            [("task_id", 1)],
            [("depends_on_task_id", 1)],
            [("task_id", 1), ("depends_on_task_id", 1)],  # Compound index for uniqueness
            [("type", 1)],
        ]
