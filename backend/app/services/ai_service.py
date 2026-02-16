from typing import Optional, Dict, List
from datetime import datetime, date
from decimal import Decimal
import uuid
import os
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.core.config import settings


class AIService:
    """Service layer for AI-powered features"""
    
    def __init__(self):
        self.enabled = os.getenv("ENABLE_AI", "false").lower() == "true"
    
    async def suggest_task_priority(
        self,
        title: str,
        description: Optional[str],
        project_id: uuid.UUID
    ) -> Dict:
        """Suggest task priority based on content analysis"""
        if not self.enabled:
            # Return default if AI is disabled
            return {
                "suggested_priority": "Medium",
                "suggested_story_points": None,
                "confidence": 0.0,
                "reasoning": "AI features are disabled"
            }
        
        try:
            # Simple keyword-based priority suggestion (can be replaced with actual AI)
            content = f"{title} {description or ''}".lower()
            
            # High priority keywords
            high_keywords = ["urgent", "critical", "blocking", "bug", "error", "broken", "fix", "asap"]
            # Low priority keywords
            low_keywords = ["nice to have", "enhancement", "improvement", "optional", "future"]
            
            high_count = sum(1 for keyword in high_keywords if keyword in content)
            low_count = sum(1 for keyword in low_keywords if keyword in content)
            
            if high_count > 0:
                priority = "High"
                confidence = min(0.8 + (high_count * 0.05), 0.95)
            elif low_count > 0:
                priority = "Low"
                confidence = min(0.7 + (low_count * 0.05), 0.9)
            else:
                priority = "Medium"
                confidence = 0.6
            
            # Estimate story points (simple heuristic)
            story_points = None
            word_count = len(content.split())
            if word_count < 50:
                story_points = Decimal("1")
            elif word_count < 200:
                story_points = Decimal("3")
            elif word_count < 500:
                story_points = Decimal("5")
            else:
                story_points = Decimal("8")
            
            return {
                "suggested_priority": priority,
                "suggested_story_points": story_points,
                "confidence": round(confidence, 2),
                "reasoning": f"Based on content analysis: {high_count} high-priority indicators, {low_count} low-priority indicators"
            }
        except Exception as e:
            # Fail gracefully - return default
            return {
                "suggested_priority": "Medium",
                "suggested_story_points": None,
                "confidence": 0.0,
                "reasoning": f"AI analysis failed: {str(e)}"
            }
    
    async def generate_daily_summary(
        self,
        user_id: uuid.UUID,
        summary_date: Optional[date] = None
    ) -> Dict:
        """Generate daily summary for CEO/Manager"""
        if not self.enabled:
            return {
                "summary": "AI features are disabled",
                "key_metrics": {},
                "highlights": [],
                "concerns": [],
                "generated_at": datetime.utcnow().isoformat()
            }
        
        try:
            if not summary_date:
                summary_date = date.today()
            
            # Get user to check role
            user = await User.find_one(User.id == user_id)
            if not user:
                raise ValueError("User not found")
            
            # Get all projects (filtered by role in real implementation)
            projects = await Project.find(
                Project.organization_id == user.organization_id,
                Project.deleted_at == None
            ).to_list()
            
            # Get tasks created/updated today
            start_datetime = datetime.combine(summary_date, datetime.min.time())
            end_datetime = datetime.combine(summary_date, datetime.max.time())
            
            tasks_created = await Task.find(
                Task.created_at >= start_datetime,
                Task.created_at <= end_datetime,
                Task.deleted_at == None
            ).to_list()
            
            tasks_completed = await Task.find(
                Task.status == "Done",
                Task.updated_at >= start_datetime,
                Task.updated_at <= end_datetime,
                Task.deleted_at == None
            ).to_list()
            
            # Calculate metrics
            total_projects = len(projects)
            active_projects = len([p for p in projects if p.status == "In Progress"])
            tasks_created_count = len(tasks_created)
            tasks_completed_count = len(tasks_completed)
            
            # Generate summary
            summary = f"Daily Summary for {summary_date.isoformat()}\n\n"
            summary += f"Active Projects: {active_projects}/{total_projects}\n"
            summary += f"Tasks Created: {tasks_created_count}\n"
            summary += f"Tasks Completed: {tasks_completed_count}\n"
            
            highlights = []
            if tasks_completed_count > 10:
                highlights.append(f"Excellent progress: {tasks_completed_count} tasks completed today")
            if active_projects > 0:
                highlights.append(f"{active_projects} projects currently in progress")
            
            concerns = []
            overdue_tasks = await Task.find(
                Task.due_date < datetime.now(),
                Task.status != "Done",
                Task.deleted_at == None
            ).to_list()
            if len(overdue_tasks) > 0:
                concerns.append(f"{len(overdue_tasks)} tasks are overdue")
            
            return {
                "summary": summary,
                "key_metrics": {
                    "total_projects": total_projects,
                    "active_projects": active_projects,
                    "tasks_created": tasks_created_count,
                    "tasks_completed": tasks_completed_count,
                    "overdue_tasks": len(overdue_tasks)
                },
                "highlights": highlights,
                "concerns": concerns,
                "generated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            # Fail gracefully
            return {
                "summary": f"Error generating summary: {str(e)}",
                "key_metrics": {},
                "highlights": [],
                "concerns": [],
                "generated_at": datetime.utcnow().isoformat()
            }
