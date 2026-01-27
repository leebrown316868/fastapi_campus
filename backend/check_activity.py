"""
Script to check activity 30 details and registration eligibility.
"""
import sqlite3
import os
from datetime import datetime

def check_activity():
    db_path = os.path.join(os.path.dirname(__file__), 'campus_hub.db')

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get activity 30 details
    cursor.execute("""
        SELECT id, title, registration_start, registration_end, activity_start, capacity, status
        FROM activities
        WHERE id = 30
    """)
    activity = cursor.fetchone()

    if not activity:
        print("[X] Activity 30 not found")
        return

    act_id, title, reg_start, reg_end, act_start, capacity, status = activity

    print(f"[*] Activity 30: {title}")
    print(f"    Registration Start: {reg_start}")
    print(f"    Registration End: {reg_end}")
    print(f"    Activity Start: {act_start}")
    print(f"    Capacity: {capacity}")
    print(f"    Status: {status}")

    # Check registration time
    now = datetime.utcnow()
    print(f"\n[*] Current Time (UTC): {now.isoformat()}")

    if reg_start and reg_end:
        reg_start_dt = datetime.fromisoformat(reg_start)
        reg_end_dt = datetime.fromisoformat(reg_end)

        print(f"[*] Registration Period:")
        print(f"    Start: {reg_start_dt.isoformat()}")
        print(f"    End: {reg_end_dt.isoformat()}")

        if now < reg_start_dt:
            print(f"    [X] Registration NOT OPEN (too early)")
            print(f"    Time until open: {(reg_start_dt - now).total_seconds() / 60:.1f} minutes")
        elif now > reg_end_dt:
            print(f"    [X] Registration CLOSED (too late)")
        else:
            print(f"    [OK] Registration is OPEN")
    else:
        print(f"    [X] No registration time set (activity doesn't require registration)")

    # Check capacity
    if capacity > 0:
        cursor.execute("""
            SELECT COUNT(*) FROM activity_registrations
            WHERE activity_id = 30 AND status = 'confirmed'
        """)
        registered = cursor.fetchone()[0]
        print(f"\n[*] Capacity Check:")
        print(f"    Capacity: {capacity}")
        print(f"    Registered: {registered}")
        if registered >= capacity:
            print(f"    [X] Activity is FULL")
        else:
            print(f"    [OK] {capacity - registered} spots available")
    else:
        print(f"\n[*] No capacity limit")

    conn.close()

if __name__ == "__main__":
    check_activity()
