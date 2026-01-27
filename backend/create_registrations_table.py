"""
Migration script to create activity_registrations table.
Run this after adding the activity registration feature.
"""
import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'campus_hub.db')

    if not os.path.exists(db_path):
        print(f"[X] Database not found at: {db_path}")
        return

    print("[*] Connecting to database...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_registrations'")
    if cursor.fetchone():
        print("[OK] Table 'activity_registrations' already exists.")
        conn.close()
        return

    print("[*] Creating activity_registrations table...")
    try:
        cursor.execute("""
            CREATE TABLE activity_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                student_id VARCHAR(50) NOT NULL,
                phone VARCHAR(20),
                remark VARCHAR(500),
                status VARCHAR(20) DEFAULT 'confirmed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                cancelled_at DATETIME,
                FOREIGN KEY (activity_id) REFERENCES activities (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        # Create indexes for better query performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_activity ON activity_registrations(activity_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_user ON activity_registrations(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_created ON activity_registrations(created_at)")

        conn.commit()
        print("[OK] Table 'activity_registrations' created successfully!")
    except sqlite3.OperationalError as e:
        print(f"[X] Failed to create table: {e}")
        conn.close()
        return

    # Verify the change
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"\n[*] Current tables: {', '.join(tables)}")

    conn.close()
    print("\n[OK] Migration completed successfully!")
    print("[INFO] You can now restart the backend server.")

if __name__ == "__main__":
    migrate()
