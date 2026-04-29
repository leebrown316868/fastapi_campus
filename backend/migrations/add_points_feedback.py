"""Add points and feedback tables, total_points to users.

Run with: python migrations/add_points_feedback.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.db.database import engine


async def migrate():
    async with engine.begin() as conn:
        # Add total_points to users
        try:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0"
            ))
            print("  Added users.total_points")
        except Exception:
            print("  Skipped users.total_points (already exists)")

        # Create point_records table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS point_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                points INTEGER NOT NULL,
                reason VARCHAR(50) NOT NULL,
                activity_id INTEGER REFERENCES activities(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        print("  Ensured point_records table")

        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_point_records_user_id ON point_records(user_id)"
        ))
        print("  Ensured ix_point_records_user_id")

        # Create activity_feedbacks table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS activity_feedbacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_id INTEGER NOT NULL REFERENCES activities(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(activity_id, user_id)
            )
        """))
        print("  Ensured activity_feedbacks table")

        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_feedbacks_activity_id ON activity_feedbacks(activity_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_feedbacks_user_id ON activity_feedbacks(user_id)"
        ))
        print("  Ensured feedback indexes")

    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
