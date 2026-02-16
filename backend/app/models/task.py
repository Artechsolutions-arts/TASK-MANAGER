from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import Field, field_validator
from bson.decimal128 import Decimal128
import uuid
from app.models.base import BaseModel, SoftDeleteMixin


class Epic(BaseModel, SoftDeleteMixin):
    """Epic model for MongoDB"""
    
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    project_id: uuid.UUID
    status: str = Field(default="Backlog", max_length=50)  # Backlog, Todo, In Progress, Review, Done
    priority: str = Field(default="Medium", max_length=20)  # Low, Medium, High, Critical
    assignee_id: Optional[uuid.UUID] = None
    reporter_id: uuid.UUID
    due_date: Optional[datetime] = None  # Changed from date to datetime for MongoDB compatibility
    
    class Settings:
        name = "epics"
        indexes = [
            [("project_id", 1)],
            [("project_id", 1), ("deleted_at", 1)],
            [("assignee_id", 1)],
            [("status", 1)],
            [("deleted_at", 1)],
        ]


class Story(BaseModel, SoftDeleteMixin):
    """Story model for MongoDB"""
    
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    epic_id: uuid.UUID
    status: str = Field(default="Backlog", max_length=50)  # Backlog, Todo, In Progress, Review, Done
    priority: str = Field(default="Medium", max_length=20)  # Low, Medium, High, Critical
    assignee_id: Optional[uuid.UUID] = None
    reporter_id: uuid.UUID
    due_date: Optional[datetime] = None  # Changed from date to datetime for MongoDB compatibility
    estimated_hours: Optional[Decimal] = None
    
    @field_validator('estimated_hours', mode='before')
    @classmethod
    def convert_decimal128(cls, v):
        """Convert Decimal128 from MongoDB to Python Decimal"""
        if v is None:
            return None
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    class Settings:
        name = "stories"
        indexes = [
            [("epic_id", 1)],
            [("epic_id", 1), ("deleted_at", 1)],
            [("assignee_id", 1)],
            [("status", 1)],
            [("deleted_at", 1)],
        ]


class Task(BaseModel, SoftDeleteMixin):
    """Task model for MongoDB"""
    
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    story_id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    sprint_id: Optional[uuid.UUID] = None  # Optional sprint assignment
    status: str = Field(default="Backlog", max_length=50)  # Backlog, Todo, In Progress, Review, Done
    priority: str = Field(default="Medium", max_length=20)  # Low, Medium, High, Critical
    assignee_id: Optional[uuid.UUID] = None
    reporter_id: uuid.UUID
    due_date: Optional[datetime] = None  # Changed from date to datetime for MongoDB compatibility
    estimated_hours: Optional[Decimal] = None
    position: int = Field(default=0)  # For Kanban ordering
    story_points: Optional[Decimal] = Field(None)  # Story points for sprint planning
    
    @field_validator('estimated_hours', mode='before')
    @classmethod
    def convert_decimal128(cls, v):
        """Convert Decimal128 from MongoDB to Python Decimal"""
        if v is None:
            return None
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    @field_validator('story_points', mode='before')
    @classmethod
    def convert_decimal128_story_points(cls, v):
        """Convert Decimal128 from MongoDB to Python Decimal"""
        if v is None:
            return None
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    class Settings:
        name = "tasks"
        indexes = [
            [("story_id", 1)],
            [("project_id", 1)],
            [("assignee_id", 1)],
            [("status", 1)],
            [("project_id", 1), ("status", 1), ("position", 1)],
            [("project_id", 1), ("deleted_at", 1), ("status", 1)],
            [("project_id", 1), ("reporter_id", 1), ("deleted_at", 1)],
            [("sprint_id", 1)],
            [("deleted_at", 1)],
        ]


class Subtask(BaseModel, SoftDeleteMixin):
    """Subtask model for MongoDB"""
    
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    task_id: uuid.UUID
    status: str = Field(default="Backlog", max_length=50)  # Backlog, Todo, In Progress, Review, Done
    priority: str = Field(default="Medium", max_length=20)  # Low, Medium, High, Critical
    assignee_id: Optional[uuid.UUID] = None
    reporter_id: uuid.UUID
    due_date: Optional[datetime] = None  # Changed from date to datetime for MongoDB compatibility
    estimated_hours: Optional[Decimal] = None
    is_completed: bool = Field(default=False)
    
    @field_validator('estimated_hours', mode='before')
    @classmethod
    def convert_decimal128(cls, v):
        """Convert Decimal128 from MongoDB to Python Decimal"""
        if v is None:
            return None
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    class Settings:
        name = "subtasks"
        indexes = [
            [("task_id", 1)],
            [("assignee_id", 1)],
            [("status", 1)],
            [("deleted_at", 1)],
        ]
