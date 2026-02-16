from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.dependencies import get_current_active_user, require_permission
from app.core.security import get_password_hash
from app.models.user import User, Role, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserPasswordUpdate, UserResponse, UserWithRoles, RoleResponse
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from app.services.cache_service import cache_delete, cache_key_user_roles
import uuid

router = APIRouter()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_permission("user", "create"))
):
    """Create a new user - CEO or Admin can create users"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    role_names = [r["role_name"] for r in user_roles]
    
    if "CEO" not in role_names and "Admin" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CEO or Admin can create new employees"
        )
    
    # Validate role first (needed for both create and restore paths)
    valid_roles = ["Manager", "Team Lead", "Employee"]
    role_name = user_data.role
    if role_name not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    db_role_name = "Member" if role_name == "Employee" else role_name
    role = await Role.find_one(Role.name == db_role_name)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{db_role_name}' not found in database"
        )

    # Check if email exists (including soft-deleted users)
    existing_by_email = await User.find_one(User.email == user_data.email)
    if existing_by_email:
        if existing_by_email.deleted_at is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        # Email belongs to a soft-deleted user: restore and update so the email can be reused
        user = existing_by_email
        user.restore()
        user.username = user_data.username
        user.password_hash = get_password_hash(user_data.password)
        user.first_name = user_data.first_name
        user.last_name = user_data.last_name
        user.organization_id = user_data.organization_id
        user.is_active = True
        user.update_timestamp()
        await user.save()

        # Replace role: remove old roles, assign new one
        await UserRole.find(UserRole.user_id == user.id).delete()
        user_role = UserRole(
            user_id=user.id,
            role_id=role.id,
            scope_type="organization",
            scope_id=None
        )
        await user_role.insert()

        audit_service = AuditService()
        await audit_service.log_action(
            action="update",
            resource_type="user",
            resource_id=str(user.id),
            user_id=str(current_user.id)
        )
        await cache_delete(cache_key_user_roles(str(user.id)))
        return user

    # Check if username already exists among active users only (only if username is provided)
    if user_data.username:
        existing_username = await User.find_one(
            User.username == user_data.username,
            User.deleted_at == None
        )
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Create new user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        organization_id=user_data.organization_id,
        is_active=True
    )
    await user.insert()

    user_role = UserRole(
        user_id=user.id,
        role_id=role.id,
        scope_type="organization",
        scope_id=None
    )
    await user_role.insert()

    audit_service = AuditService()
    await audit_service.log_action(
        action="create",
        resource_type="user",
        resource_id=str(user.id),
        user_id=str(current_user.id)
    )
    return user


@router.get("/me", response_model=UserWithRoles)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information"""
    permission_service = PermissionService()
    user_roles = await permission_service.get_user_roles(str(current_user.id))
    
    # Convert to RoleResponse format
    roles = []
    for ur in user_roles:
        role = await Role.find_one(Role.id == uuid.UUID(ur["role_id"]))
        if role:
            roles.append(RoleResponse(
                id=role.id,
                name=role.name,
                description=role.description
            ))
    
    user_response = UserResponse(
        id=current_user.id,
        username=current_user.username or '',  # Handle None for existing users
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        organization_id=current_user.organization_id,
        avatar=current_user.avatar,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )
    
    return UserWithRoles(**user_response.dict(), roles=roles)


@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_permission("user", "read"))
):
    """List users in organization"""
    users = await User.find(
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    ).sort(-User.created_at).skip(skip).limit(limit).to_list()
    
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_permission("user", "read"))
):
    """Get user by ID"""
    user = await User.find_one(
        User.id == uuid.UUID(user_id),
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(require_permission("user", "update"))
):
    """Update user"""
    user = await User.find_one(
        User.id == uuid.UUID(user_id),
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.update_timestamp()
    await user.save()
    
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="user",
        resource_id=str(user.id),
        user_id=str(current_user.id)
    )
    await cache_delete(cache_key_user_roles(str(user.id)))
    return user


@router.put("/{user_id}/password", response_model=UserResponse)
async def change_user_password(
    user_id: str,
    body: UserPasswordUpdate,
    current_user: User = Depends(require_permission("user", "update"))
):
    """Change a user's password - CEO or Admin only (has user:update)."""
    user = await User.find_one(
        User.id == uuid.UUID(user_id),
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.password_hash = get_password_hash(body.password)
    user.update_timestamp()
    await user.save()
    await cache_delete(cache_key_user_roles(str(user.id)))
    audit_service = AuditService()
    await audit_service.log_action(
        action="update",
        resource_type="user",
        resource_id=str(user.id),
        user_id=str(current_user.id)
    )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_permission("user", "delete"))
):
    """Soft-delete a user - CEO or Admin only."""
    user = await User.find_one(
        User.id == uuid.UUID(user_id),
        User.organization_id == current_user.organization_id,
        User.deleted_at == None
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.soft_delete()
    await user.save()
    await UserRole.find(UserRole.user_id == user.id).delete()
    await cache_delete(cache_key_user_roles(str(user.id)))
    audit_service = AuditService()
    await audit_service.log_action(
        action="delete",
        resource_type="user",
        resource_id=str(user.id),
        user_id=str(current_user.id)
    )
