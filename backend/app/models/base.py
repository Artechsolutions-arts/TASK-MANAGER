from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional
import uuid


class BaseModel(Document):
    """Base model with common fields for MongoDB"""
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        use_cache = True
        cache_expiration_time = 3600
        validate_on_save = True
    
    def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()


class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    deleted_at: Optional[datetime] = None
    
    def soft_delete(self):
        """Mark document as deleted"""
        self.deleted_at = datetime.utcnow()
        if isinstance(self, BaseModel):
            self.update_timestamp()
    
    def restore(self):
        """Restore soft-deleted document"""
        self.deleted_at = None
        if isinstance(self, BaseModel):
            self.update_timestamp()
