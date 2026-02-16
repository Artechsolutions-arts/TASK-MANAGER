from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from decimal import Decimal


class AITaskSuggestionRequest(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: UUID


class AITaskSuggestionResponse(BaseModel):
    suggested_priority: str  # Low, Medium, High, Critical
    suggested_story_points: Optional[Decimal] = None
    confidence: float  # 0.0 to 1.0
    reasoning: Optional[str] = None


class AIDailySummaryRequest(BaseModel):
    date: Optional[str] = None  # ISO date string, defaults to today


class AIDailySummaryResponse(BaseModel):
    summary: str
    key_metrics: dict
    highlights: List[str]
    concerns: List[str]
    generated_at: str
