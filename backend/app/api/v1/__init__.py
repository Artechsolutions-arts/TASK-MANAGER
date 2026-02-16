from fastapi import APIRouter
from app.api.v1 import auth, projects, tasks, teams, users, analytics, time_tracking, reports, activity, sprints, task_dependencies, notifications, workflows, ai, work_sheets

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(teams.router, prefix="/teams", tags=["Teams"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(time_tracking.router, prefix="/time", tags=["Time Tracking"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(activity.router, prefix="/activity", tags=["Activity"])
api_router.include_router(sprints.router, prefix="/sprints", tags=["Sprints"])
api_router.include_router(task_dependencies.router, prefix="", tags=["Task Dependencies"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(work_sheets.router, prefix="/work-sheets", tags=["Work Sheets"])