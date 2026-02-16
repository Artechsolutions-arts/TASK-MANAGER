from typing import List, Optional
from datetime import datetime
import uuid
from app.models.task_dependency import TaskDependency
from app.models.task import Task
from app.services.audit_service import AuditService


class DependencyService:
    """Service layer for task dependency management"""
    
    def __init__(self):
        self.audit_service = AuditService()
    
    async def create_dependency(
        self,
        task_id: uuid.UUID,
        depends_on_task_id: uuid.UUID,
        dependency_type: str,
        user_id: uuid.UUID
    ) -> TaskDependency:
        """Create a task dependency with circular dependency check"""
        # Validate tasks exist
        task = await Task.find_one(
            Task.id == task_id,
            Task.deleted_at == None
        )
        if not task:
            raise ValueError("Task not found")
        
        depends_on_task = await Task.find_one(
            Task.id == depends_on_task_id,
            Task.deleted_at == None
        )
        if not depends_on_task:
            raise ValueError("Dependency task not found")
        
        # Prevent self-dependency
        if task_id == depends_on_task_id:
            raise ValueError("Task cannot depend on itself")
        
        # Check for circular dependency
        if await self._has_circular_dependency(task_id, depends_on_task_id):
            raise ValueError("Circular dependency detected")
        
        # Check if dependency already exists
        existing = await TaskDependency.find_one(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_task_id == depends_on_task_id
        )
        if existing:
            raise ValueError("Dependency already exists")
        
        dependency = TaskDependency(
            task_id=task_id,
            depends_on_task_id=depends_on_task_id,
            type=dependency_type
        )
        await dependency.insert()
        
        # Log audit
        await self.audit_service.log_action(
            action="create",
            resource_type="task_dependency",
            resource_id=str(dependency.id),
            user_id=str(user_id)
        )
        
        return dependency
    
    async def _has_circular_dependency(
        self,
        task_id: uuid.UUID,
        depends_on_task_id: uuid.UUID
    ) -> bool:
        """Check if adding this dependency would create a cycle"""
        # If depends_on_task already depends on task_id (directly or indirectly), it's circular
        visited = set()
        to_check = [depends_on_task_id]
        
        while to_check:
            current_task_id = to_check.pop(0)
            if current_task_id == task_id:
                return True  # Circular dependency found
            
            if current_task_id in visited:
                continue
            visited.add(current_task_id)
            
            # Get all tasks that current_task depends on
            dependencies = await TaskDependency.find(
                TaskDependency.task_id == current_task_id
            ).to_list()
            
            for dep in dependencies:
                if dep.depends_on_task_id not in visited:
                    to_check.append(dep.depends_on_task_id)
        
        return False
    
    async def get_task_dependencies(
        self,
        task_id: uuid.UUID,
        include_details: bool = True
    ) -> List[dict]:
        """Get all dependencies for a task"""
        dependencies = await TaskDependency.find(
            TaskDependency.task_id == task_id
        ).to_list()
        
        if not include_details:
            return [{"id": str(d.id), "depends_on_task_id": str(d.depends_on_task_id), "type": d.type} for d in dependencies]
        
        # Include task details
        result = []
        for dep in dependencies:
            depends_on_task = await Task.find_one(Task.id == dep.depends_on_task_id)
            if depends_on_task:
                result.append({
                    "id": str(dep.id),
                    "task_id": str(dep.task_id),
                    "depends_on_task_id": str(dep.depends_on_task_id),
                    "type": dep.type,
                    "depends_on_task_title": depends_on_task.title,
                    "depends_on_task_status": depends_on_task.status,
                    "is_blocked": depends_on_task.status != "Done" if dep.type == "blocks" else False,
                    "created_at": dep.created_at
                })
        
        return result
    
    async def delete_dependency(
        self,
        dependency_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        """Delete a task dependency"""
        dependency = await TaskDependency.find_one(TaskDependency.id == dependency_id)
        if not dependency:
            raise ValueError("Dependency not found")
        
        await dependency.delete()
        
        # Log audit
        await self.audit_service.log_action(
            action="delete",
            resource_type="task_dependency",
            resource_id=str(dependency_id),
            user_id=str(user_id)
        )
        
        return True
    
    async def check_blocking_tasks(self, task_id: uuid.UUID) -> List[dict]:
        """Get all tasks that are blocking this task"""
        blocking_deps = await TaskDependency.find(
            TaskDependency.task_id == task_id,
            TaskDependency.type == "blocks"
        ).to_list()
        
        blocking_tasks = []
        for dep in blocking_deps:
            blocking_task = await Task.find_one(Task.id == dep.depends_on_task_id)
            if blocking_task and blocking_task.status != "Done":
                blocking_tasks.append({
                    "task_id": str(blocking_task.id),
                    "title": blocking_task.title,
                    "status": blocking_task.status
                })
        
        return blocking_tasks
