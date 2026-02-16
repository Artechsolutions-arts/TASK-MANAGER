from typing import List, Optional
from datetime import datetime
import uuid
from app.models.workflow import Workflow
from app.models.workflow import WorkflowTransition
from app.models.project import Project
from app.models.task import Task
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService


class WorkflowService:
    """Service layer for workflow management"""
    
    def __init__(self):
        self.audit_service = AuditService()
        self.permission_service = PermissionService()
    
    async def create_workflow(
        self,
        project_id: uuid.UUID,
        name: str,
        description: Optional[str],
        statuses: List[str],
        transitions: List[WorkflowTransition],
        is_default: bool,
        created_by: uuid.UUID
    ) -> Workflow:
        """Create a custom workflow for a project"""
        # Validate project exists
        project = await Project.find_one(
            Project.id == project_id,
            Project.deleted_at == None
        )
        if not project:
            raise ValueError("Project not found")
        
        # If this is set as default, unset other defaults
        if is_default:
            existing_defaults = await Workflow.find(
                Workflow.project_id == project_id,
                Workflow.is_default == True,
                Workflow.deleted_at == None
            ).to_list()
            for wf in existing_defaults:
                wf.is_default = False
                await wf.save()
        
        workflow = Workflow(
            project_id=project_id,
            name=name,
            description=description,
            statuses=statuses,
            transitions=transitions,
            is_default=is_default,
            created_by=created_by
        )
        await workflow.insert()
        
        # Log audit
        await self.audit_service.log_action(
            action="create",
            resource_type="workflow",
            resource_id=str(workflow.id),
            user_id=str(created_by)
        )
        
        return workflow
    
    async def get_project_workflow(
        self,
        project_id: uuid.UUID
    ) -> Optional[Workflow]:
        """Get the default workflow for a project, or None if using default"""
        workflow = await Workflow.find_one(
            Workflow.project_id == project_id,
            Workflow.is_default == True,
            Workflow.deleted_at == None
        )
        return workflow
    
    async def validate_transition(
        self,
        project_id: uuid.UUID,
        task_id: uuid.UUID,
        from_status: str,
        to_status: str,
        user_id: uuid.UUID
    ) -> tuple[bool, Optional[str]]:
        """Validate if a status transition is allowed"""
        # Get project workflow
        workflow = await self.get_project_workflow(project_id)
        
        # If no custom workflow, allow default transitions
        if not workflow:
            return True, None
        
        # Check if transition exists in workflow
        transition = None
        for trans in workflow.transitions:
            if trans.from_status == from_status and trans.to_status == to_status:
                transition = trans
                break
        
        if not transition:
            return False, f"Transition from '{from_status}' to '{to_status}' is not defined in workflow"
        
        # Check if user has required role
        if transition.allowed_roles:
            user_roles = await self.permission_service.get_user_roles(str(user_id))
            role_names = [r["role_name"] for r in user_roles]
            
            # Check if user has any of the allowed roles
            has_permission = any(role in transition.allowed_roles for role in role_names)
            if not has_permission:
                return False, f"User does not have required role to perform this transition. Required roles: {', '.join(transition.allowed_roles)}"
        
        return True, None
    
    async def get_available_transitions(
        self,
        project_id: uuid.UUID,
        current_status: str,
        user_id: uuid.UUID
    ) -> List[str]:
        """Get list of available status transitions for current status"""
        workflow = await self.get_project_workflow(project_id)
        
        # If no custom workflow, return default transitions
        if not workflow:
            default_transitions = {
                "Backlog": ["To Do"],
                "To Do": ["In Progress", "Backlog"],
                "In Progress": ["Review", "To Do"],
                "Review": ["Done", "In Progress"],
                "Done": []
            }
            return default_transitions.get(current_status, [])
        
        # Get user roles
        user_roles = await self.permission_service.get_user_roles(str(user_id))
        role_names = [r["role_name"] for r in user_roles]
        
        # Find transitions from current status
        available = []
        for transition in workflow.transitions:
            if transition.from_status == current_status:
                # Check if user has required role (or no role restriction)
                if not transition.allowed_roles or any(role in transition.allowed_roles for role in role_names):
                    available.append(transition.to_status)
        
        return available
    
    async def list_workflows(
        self,
        project_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Workflow]:
        """List workflows with optional project filter"""
        query = Workflow.find(Workflow.deleted_at == None)
        
        if project_id:
            query = query.find(Workflow.project_id == project_id)
        
        workflows = await query.skip(skip).limit(limit).to_list()
        return workflows
