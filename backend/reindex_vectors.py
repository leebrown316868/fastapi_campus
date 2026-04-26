#!/usr/bin/env python
"""
批量重建失物招领向量索引。
用于首次迁移或索引损坏时。
"""
import asyncio
import sys
sys.path.insert(0, ".")

from sqlalchemy import select
from app.db.database import async_session_maker
from app.models.lost_item import LostItem
from app.services.embedding_service import embedding_service


async def main():
    print("开始重建向量索引...")

    async with async_session_maker() as db:
        result = await db.execute(
            select(LostItem).where(LostItem.review_status == "approved")
        )
        items = result.scalars().all()

    item_dicts = [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description or "",
            "location": item.location or "",
            "type": item.type,
            "category": item.category,
            "created_by": item.created_by,
        }
        for item in items
    ]

    count = embedding_service.reindex_all_lost_items(item_dicts)
    print(f"成功索引 {count}/{len(items)} 条记录")


if __name__ == "__main__":
    asyncio.run(main())