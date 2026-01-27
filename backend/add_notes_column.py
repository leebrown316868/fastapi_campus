"""
Migration script to add 'notes' column to activities table.
Run this to update existing database without losing data.
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

    # Check if notes column already exists
    cursor.execute("PRAGMA table_info(activities)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'notes' in columns:
        print("[OK] Column 'notes' already exists in activities table.")
        conn.close()
        return

    print("[*] Adding 'notes' column to activities table...")
    try:
        cursor.execute("""
            ALTER TABLE activities
            ADD COLUMN notes TEXT
        """)
        conn.commit()
        print("[OK] Column 'notes' added successfully!")
    except sqlite3.OperationalError as e:
        print(f"[X] Failed to add column: {e}")
        conn.close()
        return

    # Verify the change
    cursor.execute("PRAGMA table_info(activities)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"\n[*] Current columns in activities table: {', '.join(columns)}")

    conn.close()
    print("\n[OK] Migration completed successfully!")
    print("[INFO] You can now restart the backend server.")

if __name__ == "__main__":
    migrate()
