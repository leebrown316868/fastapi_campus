"""Add targeting fields to users and notifications tables.

Run with: python migrations/add_targeting_fields.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.db.database import engine


async def migrate():
    async with engine.begin() as conn:
        # User table: add grade and department
        for col, col_type in [
            ("grade", "VARCHAR(20)"),
            ("department", "VARCHAR(100)"),
        ]:
            try:
                await conn.execute(text(
                    f"ALTER TABLE users ADD COLUMN {col} {col_type}"
                ))
                print(f"  Added users.{col}")
            except Exception:
                print(f"  Skipped users.{col} (already exists)")

        # Notification table: add target fields
        for col in ["target_grades", "target_departments", "target_majors"]:
            try:
                await conn.execute(text(
                    f"ALTER TABLE notifications ADD COLUMN {col} JSON"
                ))
                print(f"  Added notifications.{col}")
            except Exception:
                print(f"  Skipped notifications.{col} (already exists)")

    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
