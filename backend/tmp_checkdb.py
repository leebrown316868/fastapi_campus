import asyncio
from sqlalchemy import select
from app.db.database import async_session_maker
from app.models.lost_item import LostItem

async def check():
    async with async_session_maker() as db:
        result = await db.execute(select(LostItem).limit(3))
        items = result.scalars().all()
        for i in items:
            print(f'ID={i.id}, title={i.title!r}')

if __name__ == "__main__":
    asyncio.run(check())