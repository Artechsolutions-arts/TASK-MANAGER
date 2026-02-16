from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date
from uuid import UUID
from decimal import Decimal


class DashboardResponse(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    completed_tasks: int
    team_members: int
    workload_data: List[Dict[str, Any]]
    recent_activities: List[Dict[str, Any]]


class WorkloadResponse(BaseModel):
    user_id: UUID
    user_name: str
    total_hours: Decimal
    task_count: int
    completed_task_count: int
    overdue_task_count: int


class BurndownData(BaseModel):
    date: date
    planned_hours: Decimal
    actual_hours: Decimal
    remaining_hours: Decimal
