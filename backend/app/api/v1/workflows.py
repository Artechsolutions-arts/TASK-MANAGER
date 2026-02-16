from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.models.workflow import Workflow, WorkflowTransition
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from app.services.workflow_service import WorkflowService
import uuid

router = APIRouter()


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: User = Depends(require_permission("project", "update"))
):
    """Create a custom workflow for a project"""
    workflow_service = WorkflowService()
    
    # Convert transitions
    transitions = [
        WorkflowTransition(
            from_status=t.from_status,
            to_status=t.to_status,
            allowed_roles=t.allowed_roles
        )
        for t in workflow_data.transitions
    ]
    
    try:
        workflow = await workflow_service.create_workflow(
            project_id=workflow_data.project_id,
            name=workflow_data.name,
            description=workflow_data.description,
            statuses=workflow_data.statuses,
            transitions=transitions,
            is_default=workflow_data.is_default,
            created_by=current_user.id
        )
        return workflow
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[WorkflowResponse])
async def list_workflows(
    project_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(require_permission("project", "read"))
):
    """List workflows with optional project filter"""
    workflow_service = WorkflowService()
    project_uuid = uuid.UUID(project_id) if project_id else None
    workflows = await workflow_service.list_workflows(project_id=project_uuid, skip=skip, limit=limit)
    return workflows


@router.get("/projects/{project_id}/default", response_model=Optional[WorkflowResponse])
async def get_project_workflow(
    project_id: str,
    current_user: User = Depends(require_permission("project", "read"))
):
    """Get the default workflow for a project"""
    workflow_service = WorkflowService()
    workflow = await workflow_service.get_project_workflow(uuid.UUID(project_id))
    return workflow


@router.get("/projects/{project_id}/available-transitions", response_model=List[str])
async def get_available_transitions(
    project_id: str,
    current_status: str = Query(...),
    current_user: User = Depends(require_permission("task", "read"))
):
    """Get available status transitions for current status"""
    workflow_service = WorkflowService()
    transitions = await workflow_service.get_available_transitions(
        project_id=uuid.UUID(project_id),
        current_status=current_status,
        user_id=current_user.id
    )
    return transitions


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdate,
    current_user: User = Depends(require_permission("project", "update"))
):
    """Update a workflow"""
    workflow = await Workflow.find_one(
        Workflow.id == uuid.UUID(workflow_id),
        Workflow.deleted_at == None
    )
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    
    if workflow_data.name:
        workflow.name = workflow_data.name
    if workflow_data.description is not None:
        workflow.description = workflow_data.description
    if workflow_data.statuses:
        workflow.statuses = workflow_data.statuses
    if workflow_data.transitions:
        workflow.transitions = [
            WorkflowTransition(
                from_status=t.from_status,
                to_status=t.to_status,
                allowed_roles=t.allowed_roles
            )
            for t in workflow_data.transitions
        ]
    if workflow_data.is_default is not None:
        workflow.is_default = workflow_data.is_default
        # If setting as default, unset other defaults
        if workflow_data.is_default:
            workflow_service = WorkflowService()
            existing_defaults = await workflow_service.list_workflows(project_id=workflow.project_id)
            for wf in existing_defaults:
                if wf.id != workflow.id and wf.is_default:
                    wf.is_default = False
                    await wf.save()
    
    workflow.update_timestamp()
    await workflow.save()
    
    return workflow
