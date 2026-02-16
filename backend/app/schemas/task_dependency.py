from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class TaskDependencyCreate(BaseModel):
    depends_on_task_id: UUID
    type: str = "blocks"  # blocks, relates_to


class TaskDependencyResponse(BaseModel):
    id: UUID
    task_id: UUID
    depends_on_task_id: UUID
    type: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class TaskDependencyWithDetails(TaskDependencyResponse):
    """Dependency with task details"""
    depends_on_task_title: str
    depends_on_task_status: str
    is_blocked: bool  # True if blocking task is not completed
