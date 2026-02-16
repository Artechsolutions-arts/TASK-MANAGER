from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_active_user, require_permission
from app.models.user import User
from app.schemas.ai import AITaskSuggestionRequest, AITaskSuggestionResponse, AIDailySummaryRequest, AIDailySummaryResponse
from app.services.ai_service import AIService
from datetime import date
import uuid

router = APIRouter()


@router.post("/suggest-task", response_model=AITaskSuggestionResponse)
async def suggest_task(
    request: AITaskSuggestionRequest,
    current_user: User = Depends(require_permission("task", "create"))
):
    """Get AI suggestions for task priority and story points"""
    ai_service = AIService()
    suggestion = await ai_service.suggest_task_priority(
        title=request.title,
        description=request.description,
        project_id=request.project_id
    )
    return suggestion


@router.get("/daily-summary", response_model=AIDailySummaryResponse)
async def get_daily_summary(
    summary_date: Optional[str] = None,
    current_user: User = Depends(require_permission("analytics", "read"))
):
    """Generate daily summary (CEO/Manager only)"""
    from app.services.permission_service import PermissionService
    
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    # Only CEO and Manager can get daily summary
    if "CEO" not in role_names and "Manager" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CEOs and Managers can access daily summary"
        )
    
    ai_service = AIService()
    
    parsed_date = None
    if summary_date:
        try:
            parsed_date = date.fromisoformat(summary_date)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format")
    
    summary = await ai_service.generate_daily_summary(
        user_id=current_user.id,
        summary_date=parsed_date
    )
    return summary
