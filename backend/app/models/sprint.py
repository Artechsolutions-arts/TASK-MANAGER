from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import Field, field_validator
from bson.decimal128 import Decimal128
import uuid
from app.models.base import BaseModel, SoftDeleteMixin


class Sprint(BaseModel, SoftDeleteMixin):
    """Sprint model for MongoDB"""
    
    name: str = Field(..., max_length=255)
    project_id: uuid.UUID
    start_date: datetime
    end_date: datetime
    goal: Optional[str] = Field(None, max_length=1000)
    status: str = Field(default="Planned", max_length=50)  # Planned, Active, Completed
    committed_story_points: Decimal = Field(default=Decimal("0.00"))
    completed_story_points: Decimal = Field(default=Decimal("0.00"))
    created_by: uuid.UUID
    
    @field_validator('committed_story_points', 'completed_story_points', mode='before')
    @classmethod
    def convert_decimal128(cls, v):
        """Convert Decimal128 from MongoDB to Python Decimal"""
        if isinstance(v, Decimal128):
            return Decimal(str(v))
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    class Settings:
        name = "sprints"
        indexes = [
            [("project_id", 1)],
            [("status", 1)],
            [("start_date", 1)],
            [("end_date", 1)],
            [("created_by", 1)],
            [("deleted_at", 1)],
        ]
