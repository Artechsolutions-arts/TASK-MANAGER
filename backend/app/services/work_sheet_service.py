from typing import List, Optional
from datetime import date, datetime
from app.models.work_sheet import WorkSheet
from app.schemas.work_sheet import WorkSheetCreate, WorkSheetUpdate
import uuid


class WorkSheetService:
    """Service for managing work sheet entries"""
    
    async def create_work_sheet(
        self,
        user_id: uuid.UUID,
        data: WorkSheetCreate
    ) -> WorkSheet:
        """Create a new work sheet entry"""
        # Convert date to datetime if needed (Beanie/MongoDB works better with datetime)
        start_date_dt = None
        if data.start_date:
            if isinstance(data.start_date, date):
                start_date_dt = datetime.combine(data.start_date, datetime.min.time())
            elif isinstance(data.start_date, datetime):
                start_date_dt = data.start_date
            elif isinstance(data.start_date, str):
                # Parse string date
                from datetime import datetime as dt
                try:
                    start_date_dt = dt.fromisoformat(data.start_date.replace('Z', '+00:00'))
                except:
                    start_date_dt = dt.strptime(data.start_date, '%Y-%m-%d')
                    start_date_dt = datetime.combine(start_date_dt.date(), datetime.min.time())
        
        due_date_dt = None
        if data.due_date:
            if isinstance(data.due_date, date):
                due_date_dt = datetime.combine(data.due_date, datetime.min.time())
            elif isinstance(data.due_date, datetime):
                due_date_dt = data.due_date
            elif isinstance(data.due_date, str):
                # Parse string date
                from datetime import datetime as dt
                try:
                    due_date_dt = dt.fromisoformat(data.due_date.replace('Z', '+00:00'))
                except:
                    due_date_dt = dt.strptime(data.due_date, '%Y-%m-%d')
                    due_date_dt = datetime.combine(due_date_dt.date(), datetime.min.time())
        
        work_sheet = WorkSheet(
            sheet_name=data.sheet_name,
            task_id=data.task_id,
            task_name=data.task_name,
            assigned_to=user_id,  # Always assigned to the creator
            start_date=start_date_dt,
            due_date=due_date_dt,
            status=data.status or "IN-PROGRESS",
            completion_percentage=data.completion_percentage,
            notes=data.notes,
        )
        await work_sheet.insert()
        return work_sheet
    
    async def get_work_sheet(
        self,
        work_sheet_id: str,
        user_id: uuid.UUID,
        user_role: str
    ) -> Optional[WorkSheet]:
        """Get a work sheet entry (with permission check)"""
        work_sheet = await WorkSheet.get(work_sheet_id)
        if not work_sheet:
            return None
        
        # Check permissions: owner can always view, or if user is CEO/Manager/TeamLead
        if work_sheet.assigned_to == user_id:
            return work_sheet
        
        if user_role in ["CEO", "Manager", "Team Lead"]:
            return work_sheet
        
        return None
    
    async def list_work_sheets(
        self,
        user_id: uuid.UUID,
        user_role: str,
        assigned_to: Optional[uuid.UUID] = None,
        sheet_name: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[WorkSheet]:
        """List work sheets with permission filtering"""
        query = {}
        
        # If user is not CEO/Manager/TeamLead, only show their own sheets
        if user_role not in ["CEO", "Manager", "Team Lead"]:
            query["assigned_to"] = user_id
        elif assigned_to:
            # CEO/Manager/TeamLead can filter by assigned_to
            query["assigned_to"] = assigned_to
        
        if sheet_name:
            query["sheet_name"] = sheet_name
        
        if status:
            query["status"] = status
        
        # Sort by start_date ascending (so TSK01 appears first), then by task_id as fallback
        work_sheets = await WorkSheet.find(query).skip(skip).limit(limit).sort(
            +WorkSheet.start_date,
            +WorkSheet.task_id
        ).to_list()
        return work_sheets
    
    async def list_available_sheets(
        self,
        user_id: uuid.UUID,
        user_role: str,
        assigned_to: Optional[uuid.UUID] = None
    ) -> List[str]:
        """Get list of available sheet names for a user"""
        query = {}
        
        # If user is not CEO/Manager/TeamLead, only show their own sheets
        if user_role not in ["CEO", "Manager", "Team Lead"]:
            query["assigned_to"] = user_id
        elif assigned_to:
            query["assigned_to"] = assigned_to
        
        # Get all work sheets and extract unique sheet names
        work_sheets = await WorkSheet.find(query).to_list()
        sheet_names = list(set([ws.sheet_name for ws in work_sheets]))
        sheet_names.sort()
        return sheet_names
    
    async def update_work_sheet(
        self,
        work_sheet_id: str,
        user_id: uuid.UUID,
        user_role: str,
        data: WorkSheetUpdate
    ) -> Optional[WorkSheet]:
        """Update a work sheet entry (only owner can edit)"""
        work_sheet = await WorkSheet.get(work_sheet_id)
        if not work_sheet:
            return None
        
        # Only the owner can edit
        if work_sheet.assigned_to != user_id:
            return None
        
        # Update fields with date conversion
        update_data = data.dict(exclude_unset=True)
        
        # Convert date strings to datetime if needed
        if 'start_date' in update_data and update_data['start_date']:
            start_date = update_data['start_date']
            if isinstance(start_date, str):
                try:
                    # Parse YYYY-MM-DD format
                    parsed = datetime.strptime(start_date, '%Y-%m-%d')
                    update_data['start_date'] = datetime.combine(parsed.date(), datetime.min.time())
                except:
                    # Try ISO format
                    try:
                        update_data['start_date'] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    except:
                        update_data['start_date'] = None
            elif isinstance(start_date, date):
                update_data['start_date'] = datetime.combine(start_date, datetime.min.time())
        
        if 'due_date' in update_data and update_data['due_date']:
            due_date = update_data['due_date']
            if isinstance(due_date, str):
                try:
                    # Parse YYYY-MM-DD format
                    parsed = datetime.strptime(due_date, '%Y-%m-%d')
                    update_data['due_date'] = datetime.combine(parsed.date(), datetime.min.time())
                except:
                    # Try ISO format
                    try:
                        update_data['due_date'] = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    except:
                        update_data['due_date'] = None
            elif isinstance(due_date, date):
                update_data['due_date'] = datetime.combine(due_date, datetime.min.time())
        
        if update_data:
            for key, value in update_data.items():
                setattr(work_sheet, key, value)
            work_sheet.updated_at = datetime.utcnow()
            await work_sheet.save()
        
        return work_sheet
    
    async def delete_work_sheet(
        self,
        work_sheet_id: str,
        user_id: uuid.UUID
    ) -> bool:
        """Delete a work sheet entry (only owner can delete)"""
        work_sheet = await WorkSheet.get(work_sheet_id)
        if not work_sheet:
            return False
        
        # Only the owner can delete
        if work_sheet.assigned_to != user_id:
            return False
        
        await work_sheet.delete()
        return True
