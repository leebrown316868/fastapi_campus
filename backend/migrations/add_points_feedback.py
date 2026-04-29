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
                "ALTER TABLE users ADD COLUMN total_points INT DEFAULT 0"
            ))
            print("  Added users.total_points")
        except Exception:
            print("  Skipped users.total_points (already exists)")

        # Create point_records table
        try:
            await conn.execute(text("""
                CREATE TABLE point_records (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    points INT NOT NULL,
                    reason VARCHAR(50) NOT NULL,
                    activity_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (activity_id) REFERENCES activities(id)
                )
            """))
            print("  Created point_records table")
        except Exception:
            print("  Skipped point_records (already exists)")

        # Create index (safe to run multiple times in MySQL)
        try:
            await conn.execute(text(
                "CREATE INDEX ix_point_records_user_id ON point_records(user_id)"
            ))
        except Exception:
            pass

        # Create activity_feedbacks table
        try:
            await conn.execute(text("""
                CREATE TABLE activity_feedbacks (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    activity_id INT NOT NULL,
                    user_id INT NOT NULL,
                    rating INT NOT NULL,
                    comment VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(activity_id, user_id),
                    FOREIGN KEY (activity_id) REFERENCES activities(id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    CHECK(rating >= 1 AND rating <= 5)
                )
            """))
            print("  Created activity_feedbacks table")
        except Exception:
            print("  Skipped activity_feedbacks (already exists)")

        # Create indexes
        for idx_name, idx_def in [
            ("ix_activity_feedbacks_activity_id", "CREATE INDEX ix_activity_feedbacks_activity_id ON activity_feedbacks(activity_id)"),
            ("ix_activity_feedbacks_user_id", "CREATE INDEX ix_activity_feedbacks_user_id ON activity_feedbacks(user_id)"),
        ]:
            try:
                await conn.execute(text(idx_def))
            except Exception:
                pass

    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
