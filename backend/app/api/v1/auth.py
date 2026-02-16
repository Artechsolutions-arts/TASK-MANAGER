from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.config import settings
from app.core.dependencies import get_current_active_user
from app.models.user import User, RefreshToken as RefreshTokenModel
from app.schemas.auth import LoginRequest, RefreshTokenRequest, Token
from app.services.audit_service import AuditService

router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request
):
    """Authenticate user and return JWT tokens"""
    try:
        user = await User.find_one(
            User.email == login_data.email,
            User.deleted_at == None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Store refresh token
    refresh_token_model = RefreshTokenModel(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    await refresh_token_model.insert()
    
    # Log audit
    audit_service = AuditService()
    try:
        ip_address = request.client.host if request else None
        user_agent = request.headers.get("user-agent") if request else None
    except:
        ip_address = None
        user_agent = None
    await audit_service.log_action(
        action="login",
        resource_type="user",
        resource_id=str(user.id),
        user_id=str(user.id),
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest
):
    """Refresh access token using refresh token"""
    payload = decode_token(refresh_data.refresh_token)
    
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    
    # Verify refresh token exists and is valid
    refresh_token_model = await RefreshTokenModel.find_one(
        RefreshTokenModel.token == refresh_data.refresh_token,
        RefreshTokenModel.user_id == user_id,
        RefreshTokenModel.expires_at > datetime.utcnow()
    )
    
    if not refresh_token_model:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user = await User.find_one(
        User.id == user_id,
        User.is_active == True,
        User.deleted_at == None
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_data.refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user)
):
    """Logout user by invalidating refresh tokens"""
    # Delete all refresh tokens for user
    await RefreshTokenModel.find(
        RefreshTokenModel.user_id == current_user.id
    ).delete()
    
    return {"message": "Successfully logged out"}
