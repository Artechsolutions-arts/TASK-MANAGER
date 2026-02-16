from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.schemas.task_dependency import TaskDependencyCreate, TaskDependencyResponse, TaskDependencyWithDetails
from app.services.dependency_service import DependencyService
import uuid

router = APIRouter()


@router.post("/tasks/{task_id}/dependencies", response_model=TaskDependencyResponse, status_code=status.HTTP_201_CREATED)
async def create_task_dependency(
    task_id: str,
    dependency_data: TaskDependencyCreate,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Create a task dependency"""
    dependency_service = DependencyService()
    try:
        dependency = await dependency_service.create_dependency(
            task_id=uuid.UUID(task_id),
            depends_on_task_id=dependency_data.depends_on_task_id,
            dependency_type=dependency_data.type,
            user_id=current_user.id
        )
        return dependency
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/tasks/{task_id}/dependencies", response_model=List[TaskDependencyWithDetails])
async def get_task_dependencies(
    task_id: str,
    current_user: User = Depends(require_permission("task", "read"))
):
    """Get all dependencies for a task"""
    dependency_service = DependencyService()
    dependencies = await dependency_service.get_task_dependencies(
        task_id=uuid.UUID(task_id),
        include_details=True
    )
    return dependencies


@router.delete("/dependencies/{dependency_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_dependency(
    dependency_id: str,
    current_user: User = Depends(require_permission("task", "update"))
):
    """Delete a task dependency"""
    dependency_service = DependencyService()
    try:
        await dependency_service.delete_dependency(uuid.UUID(dependency_id), current_user.id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/tasks/{task_id}/blocking", response_model=List[dict])
async def get_blocking_tasks(
    task_id: str,
    current_user: User = Depends(require_permission("task", "read"))
):
    """Get all tasks that are blocking this task"""
    dependency_service = DependencyService()
    blocking_tasks = await dependency_service.check_blocking_tasks(uuid.UUID(task_id))
    return blocking_tasks
