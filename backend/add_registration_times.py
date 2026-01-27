"""
Script to add registration time to existing activities.
Run this to make existing activities open for registration.
"""
import sqlite3
import os
from datetime import datetime, timedelta

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'campus_hub.db')

    if not os.path.exists(db_path):
        print(f"[X] Database not found at: {db_path}")
        return

    print("[*] Connecting to database...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get activities without registration times
    cursor.execute("""
        SELECT id, title, activity_start, activity_end, registration_start, registration_end
        FROM activities
        ORDER BY id DESC
        LIMIT 30
    """)
    activities = cursor.fetchall()

    if not activities:
        print("[OK] No activities found or all activities already have registration times.")
        conn.close()
        return

    print(f"[*] Found {len(activities)} activities to update...\n")

    updated_count = 0
    for act in activities:
        act_id, title, act_start_str, act_end_str, reg_start_str, reg_end_str = act

        # Skip if already has registration time
        if reg_start_str and reg_end_str:
            print(f"[-] Activity {act_id} ({title}) already has registration time")
            continue

        print(f"[*] Updating activity {act_id}: {title}")

        # Parse activity start time
        try:
            if act_start_str:
                act_start = datetime.fromisoformat(act_start_str.replace('Z', '+00:00'))
            else:
                print(f"    [X] No activity_start, skipping")
                continue
        except Exception as e:
            print(f"    [X] Failed to parse activity_start: {e}")
            continue

        # Set registration period: from now until activity start time
        now = datetime.utcnow()
        reg_start = now
        reg_end = act_start

        # If activity already passed, skip
        if act_start < now:
            print(f"    [-] Activity already ended, skipping")
            continue

        # Update the activity
        cursor.execute("""
            UPDATE activities
            SET registration_start = ?,
                registration_end = ?
            WHERE id = ?
        """, (reg_start.isoformat(), reg_end.isoformat(), act_id))

        updated_count += 1
        print(f"    [OK] Registration: {reg_start.strftime('%Y-%m-%d %H:%M')} ~ {reg_end.strftime('%Y-%m-%d %H:%M')}")

    conn.commit()
    print(f"\n[OK] Updated {updated_count} activities!")
    print("[INFO] These activities are now open for registration.")

    conn.close()
    print("\n[OK] Migration completed successfully!")

if __name__ == "__main__":
    migrate()
