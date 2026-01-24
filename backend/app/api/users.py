from typing import Annotated
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import verify_password, get_password_hash
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordUpdate
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/api/users", tags=["Users"])

CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: CurrentUser,
):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    update_data: UserUpdate,
    current_user: CurrentUser,
    db: DatabaseSession,
):
    """Update current user profile."""
    # Update only provided fields
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.post("/me/change-password")
async def change_password(
    password_data: PasswordUpdate,
    current_user: CurrentUser,
    db: DatabaseSession,
):
    """Change user password."""
    # Verify old password
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )

    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}


@router.get("", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Get all users (admin only)."""
    result = await db.execute(
        select(User)
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Get a specific user by ID (admin only)."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse.model_validate(user)
