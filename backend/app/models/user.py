from typing import Optional, List
from datetime import datetime
from pydantic import Field, EmailStr
from beanie import Link
from app.models.base import BaseModel, SoftDeleteMixin
import uuid


class User(BaseModel, SoftDeleteMixin):
    """User model for MongoDB"""
    
    username: Optional[str] = Field(None, max_length=100, unique=True)  # Optional for backward compatibility
    email: EmailStr = Field(..., unique=True)
    password_hash: str
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    is_active: bool = Field(default=True)
    organization_id: uuid.UUID
    avatar: Optional[str] = None  # URL to avatar image
    
    class Settings:
        name = "users"
        indexes = [
            [("email", 1)],  # Unique index on email
            [("organization_id", 1)],
            [("deleted_at", 1)],
        ]


class Role(BaseModel):
    """Role model for MongoDB"""
    
    name: str = Field(..., max_length=50, unique=True)
    description: Optional[str] = Field(None, max_length=500)
    
    class Settings:
        name = "roles"
        indexes = [
            [("name", 1)],  # Unique index on name
        ]


class Permission(BaseModel):
    """Permission model for MongoDB"""
    
    name: str = Field(..., max_length=100, unique=True)
    description: Optional[str] = Field(None, max_length=500)
    resource: str = Field(..., max_length=50)
    action: str = Field(..., max_length=50)
    
    class Settings:
        name = "permissions"
        indexes = [
            [("name", 1)],
            [("resource", 1), ("action", 1)],
        ]


class RolePermission(BaseModel):
    """Role-Permission junction model for MongoDB"""
    
    role_id: uuid.UUID
    permission_id: uuid.UUID
    
    class Settings:
        name = "role_permissions"
        indexes = [
            [("role_id", 1), ("permission_id", 1)],  # Unique compound index
            [("role_id", 1)],
            [("permission_id", 1)],
        ]


class UserRole(BaseModel):
    """User-Role junction model for MongoDB"""
    
    user_id: uuid.UUID
    role_id: uuid.UUID
    scope_type: str = Field(..., max_length=50)  # organization, project, team
    scope_id: Optional[uuid.UUID] = None
    
    class Settings:
        name = "user_roles"
        indexes = [
            [("user_id", 1), ("role_id", 1), ("scope_type", 1), ("scope_id", 1)],  # Unique compound index
            [("user_id", 1)],
            [("role_id", 1)],
            [("scope_type", 1), ("scope_id", 1)],
        ]


class RefreshToken(BaseModel):
    """Refresh token model for MongoDB"""
    
    user_id: uuid.UUID
    token: str = Field(..., unique=True)
    expires_at: datetime
    
    class Settings:
        name = "refresh_tokens"
        indexes = [
            [("user_id", 1)],
            [("token", 1)],
            [("expires_at", 1)],
        ]
