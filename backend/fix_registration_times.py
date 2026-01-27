"""
Script to fix registration times for all activities.
Sets registration to be open immediately until activity start time.
"""
import sqlite3
import os
from datetime import datetime, timedelta

def fix_activities():
    db_path = os.path.join(os.path.dirname(__file__), 'campus_hub.db')

    print("[*] Connecting to database...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all future activities
    cursor.execute("""
        SELECT id, title, activity_start, registration_start, registration_end
        FROM activities
        WHERE activity_start > datetime('now')
        ORDER BY activity_start ASC
    """)
    activities = cursor.fetchall()

    if not activities:
        print("[OK] No future activities found.")
        conn.close()
        return

    print(f"[*] Found {len(activities)} future activities\n")

    now = datetime.utcnow()

    for act in activities:
        act_id, title, act_start_str, reg_start_str, reg_end_str = act

        print(f"[*] Activity {act_id}: {title[:50]}")

        # Parse activity start time
        try:
            act_start = datetime.fromisoformat(act_start_str.replace('Z', '+00:00').replace('+00:00', ''))
        except Exception as e:
            print(f"    [X] Failed to parse activity_start: {e}")
            continue

        # Check if activity is in the past
        if act_start < now:
            print(f"    [-] Already ended, skipping")
            continue

        # Set registration: from now until activity start
        reg_start = now
        reg_end = act_start

        cursor.execute("""
            UPDATE activities
            SET registration_start = ?,
                registration_end = ?
            WHERE id = ?
        """, (reg_start.isoformat(), reg_end.isoformat(), act_id))

        print(f"    [OK] Registration: NOW ~ {act_start.strftime('%Y-%m-%d %H:%M')}")

    conn.commit()
    print(f"\n[OK] All future activities are now open for registration!")

    conn.close()

if __name__ == "__main__":
    fix_activities()
