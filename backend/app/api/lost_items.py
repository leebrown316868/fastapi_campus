from typing import List, Optional, Annotated
from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete as sql_delete

from app.db.database import get_db
from app.models.user import User
from app.models.lost_item import LostItem
from app.schemas.lost_item import LostItemCreate, LostItemUpdate, LostItemResponse, PublisherInfo
from app.api.deps import get_current_user, get_current_admin

CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/lost-items", tags=["Lost & Found"])


@router.get("", response_model=List[LostItemResponse])
async def get_lost_items(
    item_type: Optional[str] = Query(None, alias="type", description="Filter by type: lost or found"),
    category: Optional[str] = Query(None, description="Filter by category"),
    created_by: Optional[int] = Query(None, description="Filter by user ID who created the item"),
    review_status: Optional[str] = Query(None, description="Filter by review status (admin only)"),
    skip: int = 0,
    limit: int = 100,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Get all lost and found items.

    Access rules:
    - By default: ONLY show approved items to everyone (including admins)
    - Admins can use review_status param to see pending/rejected items
    - Regular users can only see approved items
    """
    query = select(LostItem).order_by(LostItem.created_at.desc())

    if item_type:
        query = query.where(LostItem.type == item_type)
    if category:
        query = query.where(LostItem.category == category)

    # Filter by user
    if created_by is not None:
        query = query.where(LostItem.created_by == created_by)

    # Filter by review status
    if review_status:
        # Only admins can filter by review_status
        is_admin = current_user and current_user.role == 'admin'
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can filter by review status"
            )
        query = query.where(LostItem.review_status == review_status)
    else:
        # Default: only show approved items
        query = query.where(LostItem.review_status == "approved")

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    # Get publisher info for each item
    response = []
    for item in items:
        publisher = None
        if item.created_by:
            user_result = await db.execute(select(User).where(User.id == item.created_by))
            user = user_result.scalar_one_or_none()
            if user:
                publisher = PublisherInfo(
                    id=user.id,
                    name=user.name if user.show_name_in_lost_item else None,
                    avatar=user.avatar if user.show_avatar_in_lost_item else None,
                    email=user.email if user.show_email_in_lost_item else None,
                    phone=user.phone if user.show_phone_in_lost_item else None,
                )

        item_dict = {
            "id": item.id,
            "title": item.title,
            "type": item.type,
            "category": item.category,
            "description": item.description,
            "location": item.location,
            "time": item.time,
            "images": item.images or [],
            "tags": item.tags or [],
            "status": item.status,
            "review_status": item.review_status,
            "publisher": publisher.model_dump() if publisher else None,
            "created_at": item.created_at,
        }
        response.append(LostItemResponse(**item_dict))

    return response


@router.get("/{item_id}", response_model=LostItemResponse)
async def get_lost_item(
    item_id: int,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Get a specific lost item by ID.

    Only returns approved items. Unapproved items return 404.
    """
    result = await db.execute(
        select(LostItem).where(LostItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item or item.review_status != 'approved':
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Get publisher info
    publisher = None
    if item.created_by:
        user_result = await db.execute(select(User).where(User.id == item.created_by))
        user = user_result.scalar_one_or_none()
        if user:
            publisher = PublisherInfo(
                id=user.id,
                name=user.name if user.show_name_in_lost_item else None,
                avatar=user.avatar if user.show_avatar_in_lost_item else None,
                email=user.email if user.show_email_in_lost_item else None,
                phone=user.phone if user.show_phone_in_lost_item else None,
            )

    return LostItemResponse(
        id=item.id,
        title=item.title,
        type=item.type,
        category=item.category,
        description=item.description,
        location=item.location,
        time=item.time,
        images=item.images or [],
        tags=item.tags or [],
        status=item.status,
        review_status=item.review_status,
        publisher=publisher.model_dump() if publisher else None,
        created_at=item.created_at,
    )


@router.post("", response_model=LostItemResponse, status_code=status.HTTP_201_CREATED)
async def create_lost_item(
    item_data: LostItemCreate,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Create a new lost item (all authenticated users)."""
    new_item = LostItem(
        **item_data.model_dump(),
        created_by=current_user.id
    )

    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    # Get publisher info
    publisher = PublisherInfo(
        id=current_user.id,
        name=current_user.name if current_user.show_name_in_lost_item else None,
        avatar=current_user.avatar if current_user.show_avatar_in_lost_item else None,
        email=current_user.email if current_user.show_email_in_lost_item else None,
        phone=current_user.phone if current_user.show_phone_in_lost_item else None,
    )

    return LostItemResponse(
        id=new_item.id,
        title=new_item.title,
        type=new_item.type,
        category=new_item.category,
        description=new_item.description,
        location=new_item.location,
        time=new_item.time,
        images=new_item.images or [],
        tags=new_item.tags or [],
        status=new_item.status,
        review_status=new_item.review_status,
        publisher=publisher.model_dump(),
        created_at=new_item.created_at,
    )


@router.patch("/{item_id}", response_model=LostItemResponse)
async def update_lost_item(
    item_id: int,
    item_data: LostItemUpdate,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Update a lost item (owner or admin only)."""
    result = await db.execute(
        select(LostItem).where(LostItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Check ownership or admin
    if item.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this item"
        )

    # Update fields
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    # Get publisher info
    publisher = None
    if item.created_by:
        user_result = await db.execute(select(User).where(User.id == item.created_by))
        user = user_result.scalar_one_or_none()
        if user:
            publisher = PublisherInfo(
                id=user.id,
                name=user.name if user.show_name_in_lost_item else None,
                avatar=user.avatar if user.show_avatar_in_lost_item else None,
                email=user.email if user.show_email_in_lost_item else None,
                phone=user.phone if user.show_phone_in_lost_item else None,
            )

    return LostItemResponse(
        id=item.id,
        title=item.title,
        type=item.type,
        category=item.category,
        description=item.description,
        location=item.location,
        time=item.time,
        images=item.images or [],
        tags=item.tags or [],
        status=item.status,
        review_status=item.review_status,
        publisher=publisher.model_dump() if publisher else None,
        created_at=item.created_at,
    )


@router.post("/{item_id}/review", response_model=LostItemResponse)
async def review_lost_item(
    item_id: int,
    approve: bool = Query(..., description="True to approve, False to reject"),
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Review a lost item (admin only)."""
    result = await db.execute(
        select(LostItem).where(LostItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Update review status
    item.review_status = "approved" if approve else "rejected"

    await db.commit()
    await db.refresh(item)

    # Get publisher info
    publisher = None
    if item.created_by:
        user_result = await db.execute(select(User).where(User.id == item.created_by))
        user = user_result.scalar_one_or_none()
        if user:
            publisher = PublisherInfo(
                id=user.id,
                name=user.name if user.show_name_in_lost_item else None,
                avatar=user.avatar if user.show_avatar_in_lost_item else None,
                email=user.email if user.show_email_in_lost_item else None,
                phone=user.phone if user.show_phone_in_lost_item else None,
            )

    return LostItemResponse(
        id=item.id,
        title=item.title,
        type=item.type,
        category=item.category,
        description=item.description,
        location=item.location,
        time=item.time,
        images=item.images or [],
        tags=item.tags or [],
        status=item.status,
        review_status=item.review_status,
        publisher=publisher.model_dump() if publisher else None,
        created_at=item.created_at,
    )


@router.post("/batch-delete", response_model=dict)
async def batch_delete_lost_items(
    item_ids: List[int] = Body(..., embed=True),
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Delete multiple lost items (admin only)."""
    if not item_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No item IDs provided"
        )

    # Delete items
    await db.execute(
        sql_delete(LostItem).where(LostItem.id.in_(item_ids))
    )
    await db.commit()

    return {"deleted": len(item_ids)}


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lost_item(
    item_id: int,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Delete a lost item (owner or admin only)."""
    result = await db.execute(
        select(LostItem).where(LostItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Check ownership or admin
    if item.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this item"
        )

    await db.delete(item)
    await db.commit()
