from typing import List, Optional, Annotated
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

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
    skip: int = 0,
    limit: int = 100,
    db: DatabaseSession = None,
):
    """Get all lost and found items (public access)."""
    query = select(LostItem).order_by(LostItem.created_at.desc())

    if item_type:
        query = query.where(LostItem.type == item_type)
    if category:
        query = query.where(LostItem.category == category)
    if created_by is not None:
        query = query.where(LostItem.created_by == created_by)

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
                    name=user.name,
                    avatar=user.avatar or ""
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
            "publisher": publisher.model_dump() if publisher else None,
            "created_at": item.created_at,
        }
        response.append(LostItemResponse(**item_dict))

    return response


@router.get("/{item_id}", response_model=LostItemResponse)
async def get_lost_item(
    item_id: int,
    db: DatabaseSession = None,
):
    """Get a specific lost item by ID."""
    result = await db.execute(
        select(LostItem).where(LostItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
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
                name=user.name,
                avatar=user.avatar or ""
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
        name=current_user.name,
        avatar=current_user.avatar or ""
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
                name=user.name,
                avatar=user.avatar or ""
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
        publisher=publisher.model_dump() if publisher else None,
        created_at=item.created_at,
    )


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
