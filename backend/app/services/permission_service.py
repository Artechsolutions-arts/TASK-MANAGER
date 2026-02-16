from typing import List, Optional
from app.models.user import User, UserRole, Role, RolePermission, Permission
from app.services.cache_service import cache_get, cache_set, cache_key_user_roles
import uuid

# Cache TTL for user roles (seconds)
USER_ROLES_CACHE_TTL = 300


class PermissionService:
    def __init__(self):
        pass  # No database session needed with Beanie
    
    async def check_permission(
        self,
        user_id: str,
        resource: str,
        action: str,
        scope_type: Optional[str] = None,
        scope_id: Optional[str] = None
    ) -> bool:
        """Check if user has permission for a resource/action"""
        # Convert to UUID if it's a string
        if isinstance(user_id, str):
            user_uuid = uuid.UUID(user_id)
        else:
            user_uuid = user_id
        
        # Get all user roles (organization-wide and scoped)
        if scope_type and scope_id:
            # Check scoped permissions - get both scoped and organization-wide roles
            scope_uuid = uuid.UUID(scope_id)
            scoped_roles = await UserRole.find(
                UserRole.user_id == user_uuid,
                UserRole.scope_type == scope_type,
                UserRole.scope_id == scope_uuid
            ).to_list()
            
            org_roles = await UserRole.find(
                UserRole.user_id == user_uuid,
                UserRole.scope_type == "organization",
                UserRole.scope_id == None
            ).to_list()
            
            user_roles = scoped_roles + org_roles
        else:
            # Check organization-wide permissions
            user_roles = await UserRole.find(
                UserRole.user_id == user_uuid,
                UserRole.scope_type == "organization",
                UserRole.scope_id == None
            ).to_list()
        
        role_ids = [ur.role_id for ur in user_roles]
        
        if not role_ids:
            return False
        
        # Check if any role has the required permission
        permission = await Permission.find_one(
            Permission.resource == resource,
            Permission.action == action
        )
        
        if not permission:
            return False
        
        # Check if any of the user's roles have this permission
        # Beanie supports finding with role_id in list
        role_permissions = await RolePermission.find(
            RolePermission.permission_id == permission.id
        ).to_list()
        
        # Check if any role_permission has a role_id in our role_ids
        has_permission = any(rp.role_id in role_ids for rp in role_permissions)
        
        return has_permission
    
    async def get_user_permissions(self, user_id: str) -> List[dict]:
        """Get all permissions for a user"""
        user_roles = await UserRole.find(UserRole.user_id == uuid.UUID(user_id)).to_list()
        role_ids = [ur.role_id for ur in user_roles]
        
        if not role_ids:
            return []
        
        # Get all role permissions - filter in Python
        all_role_permissions = await RolePermission.find().to_list()
        role_permissions = [rp for rp in all_role_permissions if rp.role_id in role_ids]
        
        permission_ids = list(set([rp.permission_id for rp in role_permissions]))
        if not permission_ids:
            return []
        
        # Fetch all permissions and filter
        all_permissions = await Permission.find().to_list()
        permissions = [p for p in all_permissions if p.id in permission_ids]
        
        return [
            {
                "name": p.name,
                "resource": p.resource,
                "action": p.action
            }
            for p in permissions
        ]
    
    async def get_user_roles(self, user_id: str) -> List[dict]:
        """Get all roles for a user (cached for 5 min)."""
        cache_key = cache_key_user_roles(user_id)
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

        user_roles = await UserRole.find(UserRole.user_id == uuid.UUID(user_id)).to_list()
        if not user_roles:
            return []

        role_ids = [ur.role_id for ur in user_roles]
        all_roles = await Role.find().to_list()
        roles = [r for r in all_roles if r.id in role_ids]
        role_dict = {r.id: r for r in roles}

        result = [
            {
                "role_id": str(ur.role_id),
                "role_name": role_dict.get(ur.role_id, Role(name="Unknown")).name,
                "scope_type": ur.scope_type,
                "scope_id": str(ur.scope_id) if ur.scope_id else None,
            }
            for ur in user_roles
        ]
        await cache_set(cache_key, result, USER_ROLES_CACHE_TTL)
        return result
