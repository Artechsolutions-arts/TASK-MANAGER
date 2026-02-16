from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import uuid
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.project import Project
from app.services.audit_service import AuditService
from app.services.activity_service import ActivityService


class SprintService:
    """Service layer for sprint management"""
    
    def __init__(self):
        self.audit_service = AuditService()
        self.activity_service = ActivityService()
    
    async def create_sprint(
        self,
        name: str,
        project_id: uuid.UUID,
        start_date: datetime,
        end_date: datetime,
        goal: Optional[str],
        committed_story_points: Decimal,
        created_by: uuid.UUID
    ) -> Sprint:
        """Create a new sprint"""
        # Validate project exists
        project = await Project.find_one(
            Project.id == project_id,
            Project.deleted_at == None
        )
        if not project:
            raise ValueError("Project not found")
        
        # Validate dates
        if start_date >= end_date:
            raise ValueError("Start date must be before end date")
        
        sprint = Sprint(
            name=name,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date,
            goal=goal,
            status="Planned",
            committed_story_points=committed_story_points,
            completed_story_points=Decimal("0.00"),
            created_by=created_by
        )
        await sprint.insert()
        
        # Log audit
        await self.audit_service.log_action(
            action="create",
            resource_type="sprint",
            resource_id=str(sprint.id),
            user_id=str(created_by)
        )
        
        return sprint
    
    async def start_sprint(self, sprint_id: uuid.UUID, user_id: uuid.UUID) -> Sprint:
        """Start a sprint (change status to Active)"""
        sprint = await Sprint.find_one(
            Sprint.id == sprint_id,
            Sprint.deleted_at == None
        )
        if not sprint:
            raise ValueError("Sprint not found")
        
        if sprint.status != "Planned":
            raise ValueError(f"Cannot start sprint with status: {sprint.status}")
        
        sprint.status = "Active"
        sprint.update_timestamp()
        await sprint.save()
        
        # Log audit
        await self.audit_service.log_action(
            action="start",
            resource_type="sprint",
            resource_id=str(sprint.id),
            user_id=str(user_id)
        )
        
        return sprint
    
    async def complete_sprint(self, sprint_id: uuid.UUID, user_id: uuid.UUID) -> Sprint:
        """Complete a sprint and calculate story points"""
        sprint = await Sprint.find_one(
            Sprint.id == sprint_id,
            Sprint.deleted_at == None
        )
        if not sprint:
            raise ValueError("Sprint not found")
        
        if sprint.status != "Active":
            raise ValueError(f"Cannot complete sprint with status: {sprint.status}")
        
        # Calculate completed story points
        completed_tasks = await Task.find(
            Task.sprint_id == sprint_id,
            Task.status == "Done",
            Task.deleted_at == None
        ).to_list()
        
        completed_points = Decimal("0.00")
        for task in completed_tasks:
            if task.story_points:
                completed_points += task.story_points
        
        sprint.completed_story_points = completed_points
        sprint.status = "Completed"
        sprint.update_timestamp()
        await sprint.save()
        
        # Log audit
        await self.audit_service.log_action(
            action="complete",
            resource_type="sprint",
            resource_id=str(sprint.id),
            user_id=str(user_id)
        )
        
        return sprint
    
    async def get_sprint_summary(self, sprint_id: uuid.UUID) -> dict:
        """Get sprint summary with progress"""
        sprint = await Sprint.find_one(
            Sprint.id == sprint_id,
            Sprint.deleted_at == None
        )
        if not sprint:
            raise ValueError("Sprint not found")
        
        # Get all tasks in sprint
        all_tasks = await Task.find(
            Task.sprint_id == sprint_id,
            Task.deleted_at == None
        ).to_list()
        
        completed_tasks = [t for t in all_tasks if t.status == "Done"]
        
        total_tasks = len(all_tasks)
        completed_count = len(completed_tasks)
        progress_percentage = (completed_count / total_tasks * 100) if total_tasks > 0 else 0.0
        
        # Story points progress
        story_points_progress = 0.0
        if sprint.committed_story_points > 0:
            story_points_progress = float(sprint.completed_story_points / sprint.committed_story_points * 100)
        
        return {
            "sprint": sprint,
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "progress_percentage": round(progress_percentage, 2),
            "story_points_progress": round(story_points_progress, 2)
        }
    
    async def list_sprints(
        self,
        project_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sprint]:
        """List sprints with optional filters"""
        query = Sprint.find(Sprint.deleted_at == None)
        
        if project_id:
            query = query.find(Sprint.project_id == project_id)
        
        if status:
            query = query.find(Sprint.status == status)
        
        sprints = await query.skip(skip).limit(limit).to_list()
        return sprints
