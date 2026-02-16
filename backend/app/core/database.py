from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from typing import Optional

# Global MongoDB client
mongodb_client: Optional[AsyncIOMotorClient] = None


async def init_db():
    """Initialize MongoDB connection and Beanie"""
    global mongodb_client
    
    # Create Motor client with connection pool for scalability
    mongodb_client = AsyncIOMotorClient(
        settings.DATABASE_URL,
        maxPoolSize=50,
        minPoolSize=10,
        maxIdleTimeMS=45000,
        serverSelectionTimeoutMS=5000,
    )
    
    # Get database name from connection string
    db_name = settings.DATABASE_URL.split("/")[-1].split("?")[0]
    
    # Import all models here to avoid circular imports
    from app.models.organization import Organization
    from app.models.user import User, Role, Permission, RolePermission, UserRole, RefreshToken
    from app.models.project import Project, ProjectTeam
    from app.models.team import Team, TeamMember
    from app.models.task import Epic, Story, Task, Subtask
    from app.models.time_tracking import TimeEntry
    from app.models.audit import AuditLog
    from app.models.report import Report
    from app.models.activity import Activity
    from app.models.sprint import Sprint
    from app.models.task_dependency import TaskDependency
    from app.models.notification import Notification
    from app.models.workflow import Workflow
    from app.models.work_sheet import WorkSheet
    
    # Initialize Beanie with all document models
    await init_beanie(
        database=mongodb_client[db_name],
        document_models=[
            Organization,
            User,
            Role,
            Permission,
            RolePermission,
            UserRole,
            RefreshToken,
            Project,
            ProjectTeam,
            Team,
            TeamMember,
            Epic,
            Story,
            Task,
            Subtask,
            TimeEntry,
            AuditLog,
            Report,
            Activity,
            Sprint,
            TaskDependency,
            Notification,
            Workflow,
            WorkSheet,
        ]
    )


async def close_db():
    """Close MongoDB connection"""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
