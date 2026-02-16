from typing import Optional, Dict, Any
from app.models.audit import AuditLog
from datetime import datetime
import uuid


class AuditService:
    def __init__(self):
        pass  # No database session needed with Beanie
    
    async def log_action(
        self,
        action: str,
        resource_type: str,
        resource_id: str,
        user_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log an audit action"""
        audit_log = AuditLog(
            user_id=uuid.UUID(user_id) if user_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=uuid.UUID(resource_id),
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
        await audit_log.insert()
        return audit_log
