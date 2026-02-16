from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.work_sheet import WorkSheetCreate, WorkSheetUpdate, WorkSheetResponse
from app.services.work_sheet_service import WorkSheetService
from app.services.permission_service import PermissionService
import uuid

router = APIRouter()


@router.post("", response_model=WorkSheetResponse, status_code=status.HTTP_201_CREATED)
async def create_work_sheet(
    data: WorkSheetCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new work sheet entry"""
    service = WorkSheetService()
    work_sheet = await service.create_work_sheet(current_user.id, data)
    # Convert datetime to date for response
    start_date_resp = work_sheet.start_date.date() if work_sheet.start_date else None
    due_date_resp = work_sheet.due_date.date() if work_sheet.due_date else None
    return WorkSheetResponse(
        id=str(work_sheet.id),
        sheet_name=work_sheet.sheet_name,
        task_id=work_sheet.task_id,
        task_name=work_sheet.task_name,
        assigned_to=work_sheet.assigned_to,
        start_date=start_date_resp,
        due_date=due_date_resp,
        status=work_sheet.status,
        completion_percentage=work_sheet.completion_percentage,
        notes=work_sheet.notes,
        created_at=work_sheet.created_at,
        updated_at=work_sheet.updated_at,
    )


@router.get("", response_model=List[WorkSheetResponse])
async def list_work_sheets(
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user ID"),
    sheet_name: Optional[str] = Query(None, description="Filter by sheet name"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_active_user)
):
    """List work sheets with permission filtering"""
    service = WorkSheetService()
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    user_role = user_roles[0]["role_name"] if user_roles else "Member"
    
    assigned_to_uuid = None
    if assigned_to:
        try:
            assigned_to_uuid = uuid.UUID(assigned_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid assigned_to UUID")
    
    work_sheets = await service.list_work_sheets(
        user_id=current_user.id,
        user_role=user_role,
        assigned_to=assigned_to_uuid,
        sheet_name=sheet_name,
        status=status,
        skip=skip,
        limit=limit
    )
    
    return [
        WorkSheetResponse(
            id=str(ws.id),
            sheet_name=ws.sheet_name,
            task_id=ws.task_id,
            task_name=ws.task_name,
            assigned_to=ws.assigned_to,
            start_date=ws.start_date.date() if ws.start_date else None,
            due_date=ws.due_date.date() if ws.due_date else None,
            status=ws.status,
            completion_percentage=ws.completion_percentage,
            notes=ws.notes,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
        )
        for ws in work_sheets
    ]


@router.get("/sheets", response_model=List[str])
async def list_available_sheets(
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user ID"),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of available sheet names"""
    service = WorkSheetService()
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    user_role = user_roles[0]["role_name"] if user_roles else "Member"
    
    assigned_to_uuid = None
    if assigned_to:
        try:
            assigned_to_uuid = uuid.UUID(assigned_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid assigned_to UUID")
    
    sheets = await service.list_available_sheets(
        user_id=current_user.id,
        user_role=user_role,
        assigned_to=assigned_to_uuid
    )
    return sheets


@router.get("/{work_sheet_id}", response_model=WorkSheetResponse)
async def get_work_sheet(
    work_sheet_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific work sheet entry"""
    service = WorkSheetService()
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    user_role = user_roles[0]["role_name"] if user_roles else "Member"
    
    work_sheet = await service.get_work_sheet(work_sheet_id, current_user.id, user_role)
    if not work_sheet:
        raise HTTPException(status_code=404, detail="Work sheet not found")
    
    start_date_resp = work_sheet.start_date.date() if work_sheet.start_date else None
    due_date_resp = work_sheet.due_date.date() if work_sheet.due_date else None
    return WorkSheetResponse(
        id=str(work_sheet.id),
        sheet_name=work_sheet.sheet_name,
        task_id=work_sheet.task_id,
        task_name=work_sheet.task_name,
        assigned_to=work_sheet.assigned_to,
        start_date=start_date_resp,
        due_date=due_date_resp,
        status=work_sheet.status,
        completion_percentage=work_sheet.completion_percentage,
        notes=work_sheet.notes,
        created_at=work_sheet.created_at,
        updated_at=work_sheet.updated_at,
    )


@router.put("/{work_sheet_id}", response_model=WorkSheetResponse)
async def update_work_sheet(
    work_sheet_id: str,
    data: WorkSheetUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a work sheet entry (only owner can edit)"""
    service = WorkSheetService()
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    user_role = user_roles[0]["role_name"] if user_roles else "Member"
    
    work_sheet = await service.update_work_sheet(work_sheet_id, current_user.id, user_role, data)
    if not work_sheet:
        raise HTTPException(status_code=404, detail="Work sheet not found or you don't have permission to edit")
    
    start_date_resp = work_sheet.start_date.date() if work_sheet.start_date else None
    due_date_resp = work_sheet.due_date.date() if work_sheet.due_date else None
    return WorkSheetResponse(
        id=str(work_sheet.id),
        sheet_name=work_sheet.sheet_name,
        task_id=work_sheet.task_id,
        task_name=work_sheet.task_name,
        assigned_to=work_sheet.assigned_to,
        start_date=start_date_resp,
        due_date=due_date_resp,
        status=work_sheet.status,
        completion_percentage=work_sheet.completion_percentage,
        notes=work_sheet.notes,
        created_at=work_sheet.created_at,
        updated_at=work_sheet.updated_at,
    )


@router.delete("/{work_sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work_sheet(
    work_sheet_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a work sheet entry (only owner can delete)"""
    service = WorkSheetService()
    success = await service.delete_work_sheet(work_sheet_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Work sheet not found or you don't have permission to delete")
    return None
