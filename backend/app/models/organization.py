from beanie import Indexed
from pydantic import Field
from app.models.base import BaseModel, SoftDeleteMixin


class Organization(BaseModel, SoftDeleteMixin):
    """Organization model for MongoDB"""
    
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    
    class Settings:
        name = "organizations"
        indexes = [
            [("slug", 1)],  # Unique index on slug
            [("deleted_at", 1)],  # Index for soft delete queries
        ]
