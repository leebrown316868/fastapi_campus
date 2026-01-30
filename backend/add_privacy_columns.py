# -*- coding: utf-8 -*-
"""
Add privacy settings columns to users table.
Run this script to migrate existing database.
"""
import asyncio
import sys
from sqlalchemy import text
from app.db.database import async_session_maker


async def migrate():
    """Add privacy settings columns to users table."""
    async with async_session_maker() as session:
        try:
            # Check if columns already exist
            result = await session.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]

            # Add columns if they don't exist
            if 'show_name_in_lost_item' not in columns:
                await session.execute(text(
                    "ALTER TABLE users ADD COLUMN show_name_in_lost_item BOOLEAN DEFAULT 1"
                ))
                sys.stdout.write("[+] Added show_name_in_lost_item column\n")

            if 'show_avatar_in_lost_item' not in columns:
                await session.execute(text(
                    "ALTER TABLE users ADD COLUMN show_avatar_in_lost_item BOOLEAN DEFAULT 1"
                ))
                sys.stdout.write("[+] Added show_avatar_in_lost_item column\n")

            if 'show_email_in_lost_item' not in columns:
                await session.execute(text(
                    "ALTER TABLE users ADD COLUMN show_email_in_lost_item BOOLEAN DEFAULT 0"
                ))
                sys.stdout.write("[+] Added show_email_in_lost_item column\n")

            if 'show_phone_in_lost_item' not in columns:
                await session.execute(text(
                    "ALTER TABLE users ADD COLUMN show_phone_in_lost_item BOOLEAN DEFAULT 0"
                ))
                sys.stdout.write("[+] Added show_phone_in_lost_item column\n")

            await session.commit()
            sys.stdout.write("\n[OK] Migration completed successfully!\n")

        except Exception as e:
            await session.rollback()
            sys.stdout.write(f"\n[ERROR] Migration failed: {e}\n")
            raise


if __name__ == "__main__":
    sys.stdout.write("Starting privacy settings migration...\n")
    asyncio.run(migrate())
