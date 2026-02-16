from typing import Optional
from datetime import date
from decimal import Decimal
from pydantic import Field, field_validator
from bson.decimal128 import Decimal128
import uuid
from app.models.base import BaseModel, SoftDeleteMixin


class TimeEntry(BaseModel, SoftDeleteMixin):
    """Time entry model for MongoDB"""
    
    user_id: uuid.UUID
    task_id: Optional[uuid.UUID] = None
    subtask_id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    hours: Decimal
    date: date
    description: Optional[str] = Field(None, max_length=5000)
    
    @field_validator('hours', mode='before')
    @classmethod
    def convert_decimal128(cls, v):
        """Convert Decimal128 from MongoDB to Python Decimal"""
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    class Settings:
        name = "time_entries"
        indexes = [
            [("user_id", 1)],
            [("user_id", 1), ("deleted_at", 1), ("date", -1)],
            [("task_id", 1)],
            [("subtask_id", 1)],
            [("project_id", 1)],
            [("date", 1)],
            [("deleted_at", 1)],
        ]
