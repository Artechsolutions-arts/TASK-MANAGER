from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class WorkflowTransitionCreate(BaseModel):
    from_status: str
    to_status: str
    allowed_roles: List[str] = []


class WorkflowTransitionResponse(BaseModel):
    from_status: str
    to_status: str
    allowed_roles: List[str]
    
    class Config:
        from_attributes = True


class WorkflowCreate(BaseModel):
    project_id: UUID
    name: str
    description: Optional[str] = None
    statuses: List[str]
    transitions: List[WorkflowTransitionCreate]
    is_default: bool = False


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    statuses: Optional[List[str]] = None
    transitions: Optional[List[WorkflowTransitionCreate]] = None
    is_default: Optional[bool] = None


class WorkflowResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: Optional[str] = None
    statuses: List[str]
    transitions: List[WorkflowTransitionResponse]
    is_default: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
