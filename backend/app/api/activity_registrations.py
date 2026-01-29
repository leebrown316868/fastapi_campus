"""
Activity registration API endpoints.
"""
from typing import List, Annotated, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.db.database import get_db
from app.models.user import User
from app.models.activity import Activity
from app.models.activity_registration import ActivityRegistration
from app.schemas.activity_registration import (
    ActivityRegistrationCreate,
    ActivityRegistrationResponse,
    RegistrationListResponse,
)
from app.api.deps import get_current_user, get_current_admin


# Type aliases for this file
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/activities", tags=["Activity-Registrations"])

# IMPORTANT: my-registrations must be defined BEFORE {activity_id} routes
@router.get("/my-registrations", response_model=List[ActivityRegistrationResponse])
async def get_my_registrations(
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Get current user's activity registrations."""
    result = await db.execute(
        select(ActivityRegistration)
        .where(ActivityRegistration.user_id == current_user.id)
        .order_by(ActivityRegistration.created_at.desc())
    )
    registrations = result.scalars().all()

    return [ActivityRegistrationResponse.model_validate(r) for r in registrations]

@router.post("/{activity_id}/register", response_model=ActivityRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_activity(
    activity_id: int,
    registration_data: ActivityRegistrationCreate,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Register current user for an activity."""
    # Check if activity exists
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    # Check if activity requires registration
    if not activity.registration_start or not activity.registration_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This activity does not require registration"
        )

    # Check if registration period is open
    from datetime import datetime
    now = datetime.utcnow()

    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Registration check for activity {activity_id}:")
    logger.info(f"  now (utcnow): {now.isoformat()}")
    logger.info(f"  registration_start: {activity.registration_start.isoformat() if activity.registration_start else None}")
    logger.info(f"  registration_end: {activity.registration_end.isoformat() if activity.registration_end else None}")
    logger.info(f"  now < reg_start: {now < activity.registration_start if activity.registration_start else 'N/A'}")
    logger.info(f"  now > reg_end: {now > activity.registration_end if activity.registration_end else 'N/A'}")

    if now < activity.registration_start or now > activity.registration_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is not open at this time"
        )

    # Check if activity is full
    if activity.capacity > 0:
        count_result = await db.execute(
            select(func.count(ActivityRegistration.id))
            .where(
                and_(
                    ActivityRegistration.activity_id == activity_id,
                    ActivityRegistration.status == "confirmed"
                )
            )
        )
        registered_count = count_result.scalar() or 0
        if registered_count >= activity.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Activity is fully booked"
            )

    # Check if user already registered
    existing_result = await db.execute(
        select(ActivityRegistration).where(
            and_(
                ActivityRegistration.activity_id == activity_id,
                ActivityRegistration.user_id == current_user.id,
                ActivityRegistration.status.in_(["confirmed", "attended"])
            )
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already registered for this activity"
    )

    # Create registration
    registration = ActivityRegistration(
        activity_id=activity_id,
        user_id=current_user.id,
        name=registration_data.name or current_user.name,
        student_id=registration_data.student_id or current_user.student_id,
        phone=registration_data.phone,
        remark=registration_data.remark,
        status="confirmed",
    )

    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    return ActivityRegistrationResponse.model_validate(registration)


@router.get("/{activity_id}/registrations", response_model=RegistrationListResponse)
async def get_activity_registrations(
    activity_id: int,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Get all registrations for an activity (admin only)."""
    # Check if activity exists
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    # Build query
    query = select(ActivityRegistration).where(ActivityRegistration.activity_id == activity_id)

    if status_filter:
        query = query.where(ActivityRegistration.status == status_filter)

    # Get total count
    count_query = select(func.count(ActivityRegistration.id)).where(ActivityRegistration.activity_id == activity_id)
    if status_filter:
        count_query = count_query.where(ActivityRegistration.status == status_filter)

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get registrations with user info
    query = query.order_by(ActivityRegistration.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    registrations = result.scalars().all()

    # Build response with user info
    registration_list = []
    for reg in registrations:
        # Get user info
        user_result = await db.execute(select(User).where(User.id == reg.user_id))
        user = user_result.scalar_one_or_none()

        reg_dict = {
            "id": reg.id,
            "activity_id": reg.activity_id,
            "user_id": reg.user_id,
            "name": reg.name,
            "student_id": reg.student_id,
            "phone": reg.phone,
            "remark": reg.remark,
            "status": reg.status,
            "created_at": reg.created_at,
            "cancelled_at": reg.cancelled_at,
            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
        }
        registration_list.append(ActivityRegistrationResponse(**reg_dict))

    return RegistrationListResponse(
        registrations=registration_list,
        total=total,
        activity_name=activity.title
    )


@router.delete("/registrations/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_registration(
    registration_id: int,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Cancel a registration."""
    result = await db.execute(
        select(ActivityRegistration).where(
            and_(
                ActivityRegistration.id == registration_id,
                ActivityRegistration.user_id == current_user.id
            )
        )
    )
    registration = result.scalar_one_or_none()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )

    if registration.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is already cancelled"
        )

    registration.status = "cancelled"
    from datetime import datetime
    registration.cancelled_at = datetime.utcnow()

    await db.commit()

    return None


@router.get("/{activity_id}/registrations/export", status_code=status.HTTP_200_OK)
async def export_activity_registrations(
    activity_id: int,
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Export activity registrations as Excel file (admin only)."""
    # Check if activity exists
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    # Build query
    query = select(ActivityRegistration).where(ActivityRegistration.activity_id == activity_id)

    if status_filter:
        query = query.where(ActivityRegistration.status == status_filter)

    # Get registrations
    query = query.order_by(ActivityRegistration.created_at.desc())
    result = await db.execute(query)
    registrations = result.scalars().all()

    # Get user info for each registration
    export_data = []
    for reg in registrations:
        user_result = await db.execute(select(User).where(User.id == reg.user_id))
        user = user_result.scalar_one_or_none()

        status_map = {
            "confirmed": "已确认",
            "cancelled": "已取消",
            "attended": "已参加"
        }

        export_data.append({
            "姓名": reg.name,
            "学号": reg.student_id,
            "邮箱": user.email if user else "",
            "联系电话": reg.phone or "",
            "备注": reg.remark or "",
            "状态": status_map.get(reg.status, reg.status),
            "报名时间": reg.created_at.strftime("%Y-%m-%d %H:%M:%S") if reg.created_at else "",
            "取消时间": reg.cancelled_at.strftime("%Y-%m-%d %H:%M:%S") if reg.cancelled_at else "",
        })

    # Create Excel file using pandas
    import pandas as pd
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    df = pd.DataFrame(export_data)

    # Create Excel file with Chinese font support
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='报名名单')
        # Auto-adjust column widths
        worksheet = writer.sheets['报名名单']
        for idx, col in enumerate(worksheet.columns, 1):
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column].width = adjusted_width

    output.seek(0)

    # Create filename
    filename = f"报名名单_{activity.title}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.xlsx"

    # Return file response
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=utf-8''{filename}"
        }
    )
