from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    username: Optional[str] = None  # Optional for backward compatibility
    email: EmailStr
    first_name: str
    last_name: str


class UserCreate(UserBase):
    password: str
    organization_id: UUID
    role: str  # Manager, Team Lead, or Employee (Member)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserPasswordUpdate(BaseModel):
    """Schema for admin/CEO to change another user's password"""
    password: str


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    organization_id: UUID
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    id: UUID
    name: str
    resource: str
    action: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserWithRoles(UserResponse):
    roles: List[RoleResponse] = []
