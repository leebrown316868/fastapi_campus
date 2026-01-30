from typing import Annotated, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
import io
import datetime

from app.core.security import verify_password, get_password_hash
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse, UserUpdate, PasswordUpdate,
    UserStatusUpdate, UserBulkDelete, UserBulkUpdate
)
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
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Get all users with filtering options (admin only)."""
    query = select(User)

    # Apply filters
    if search:
        query = query.where(
            User.name.contains(search) |
            User.email.contains(search) |
            User.student_id.contains(search)
        )
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: DatabaseSession = None,
):
    """Get a specific user by ID (public access).

    Returns public user profile information for viewing publisher details.
    Sensitive information is not included in the response.
    """
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


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_users(
    file: UploadFile = File(...),
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Import users from CSV or Excel file (admin only).

    Expected columns:
    - name (required)
    - email (required)
    - student_id (optional)
    - role (optional, defaults to 'user')
    - major (optional)
    - password (optional, defaults to '123456')
    """
    # Check file type
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files are supported"
        )

    try:
        # Read file
        content = await file.read()

        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
        else:
            df = pd.read_excel(io.BytesIO(content))

        # Validate required columns
        required_columns = ['name', 'email']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )

        # Import users
        results = {
            "success": 0,
            "failed": 0,
            "errors": []
        }

        for _, row in df.iterrows():
            try:
                # Check if email already exists
                existing = await db.execute(
                    select(User).where(User.email == str(row['email']).strip())
                )
                if existing.scalar_one_or_none():
                    results["errors"].append(f"Row {_ + 2}: Email '{row['email']}' already exists")
                    results["failed"] += 1
                    continue

                # Create user
                user = User(
                    name=str(row['name']).strip(),
                    email=str(row['email']).strip().lower(),
                    student_id=str(row.get('student_id', '')).strip() or None,
                    role=str(row.get('role', 'user')).strip() if pd.notna(row.get('role')) else 'user',
                    major=str(row.get('major', '')).strip() or None if pd.notna(row.get('major')) else None,
                    hashed_password=get_password_hash(str(row.get('password', '123456')).strip()),
                    is_verified=True
                )

                db.add(user)
                await db.flush()
                results["success"] += 1

            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Row {_ + 2}: {str(e)}")

        await db.commit()

        return results

    except Exception as e:
        await db.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: int,
    status_data: UserStatusUpdate,
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Update user status (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update status
    if status_data.is_active is not None:
        user.is_active = status_data.is_active

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.patch("/bulk", response_model=dict)
async def bulk_update_users(
    bulk_data: UserBulkUpdate,
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Bulk update users (admin only)."""
    result = await db.execute(
        select(User).where(User.id.in_(bulk_data.user_ids))
    )
    users = result.scalars().all()

    if not users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No users found"
        )

    updated_count = 0
    for user in users:
        if bulk_data.is_active is not None:
            user.is_active = bulk_data.is_active
        updated_count += 1

    await db.commit()

    return {"updated": updated_count}


@router.delete("/bulk", response_model=dict)
async def bulk_delete_users(
    bulk_data: UserBulkDelete,
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Bulk delete users (admin only)."""
    result = await db.execute(
        select(User).where(User.id.in_(bulk_data.user_ids))
    )
    users = result.scalars().all()

    if not users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No users found"
        )

    # Prevent deleting admins
    for user in users:
        if user.role == "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete admin user: {user.email}"
            )

    deleted_count = 0
    for user in users:
        await db.delete(user)
        deleted_count += 1

    await db.commit()

    return {"deleted": deleted_count}


@router.get("/export")
async def export_users(
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Export users to Excel (admin only)."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    # Create DataFrame
    data = []
    for user in users:
        data.append({
            "ID": user.id,
            "学号": user.student_id,
            "姓名": user.name,
            "邮箱": user.email,
            "角色": user.role,
            "专业": user.major or "",
            "状态": "启用" if user.is_active else "禁用",
            "注册时间": user.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    df = pd.DataFrame(data)

    # Convert to Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='用户数据')

    output.seek(0)

    # Generate filename with timestamp
    filename = f"users_export_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: int,
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Delete a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting admins
    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete admin users"
        )

    await db.delete(user)
    await db.commit()

    return {"deleted": user_id}
