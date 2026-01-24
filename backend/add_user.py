"""
Add a new user to the database.
Usage: python add_user.py <email> <password> <name> [role]

Examples:
  python add_user.py new@student.com pass123 张三 user
  python add_user.py admin2@campus.edu admin456 李老师 admin
"""
import asyncio
import sys
import io

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from sqlalchemy import select
from app.db.database import async_session_maker
from app.models import User
from app.core.security import get_password_hash


async def add_user(email: str, password: str, name: str, role: str = "user", student_id: str = None):
    """Add a new user to the database."""
    async with async_session_maker() as session:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[ERROR] User with email '{email}' already exists!")
            return False

        # Create new user
        new_user = User(
            email=email,
            student_id=student_id or email.split("@")[0].upper(),
            name=name,
            hashed_password=get_password_hash(password),
            role=role,
            is_active=True,
            is_verified=True,
        )
        session.add(new_user)
        await session.commit()

        print(f"[OK] User created successfully!")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  Name: {name}")
        print(f"  Role: {role}")
        print(f"  Student ID: {new_user.student_id}")
        return True


def main():
    if len(sys.argv) < 4:
        print("Usage: python add_user.py <email> <password> <name> [role] [student_id]")
        print()
        print("Examples:")
        print("  python add_user.py new@student.com pass123 张三 user")
        print("  python add_user.py admin2@campus.edu admin456 李老师 admin")
        print("  python add_user.py wang@campus.edu pass123 王五 user 2024001001")
        print()
        print("Arguments:")
        print("  email       - User email (required)")
        print("  password    - User password (required)")
        print("  name        - User display name (required)")
        print("  role        - User role: 'user' or 'admin' (default: user)")
        print("  student_id  - Student ID (default: auto-generated from email)")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3]
    role = sys.argv[4] if len(sys.argv) > 4 else "user"
    student_id = sys.argv[5] if len(sys.argv) > 5 else None

    # Validate role
    if role not in ["user", "admin"]:
        print("[ERROR] Role must be 'user' or 'admin'")
        sys.exit(1)

    asyncio.run(add_user(email, password, name, role, student_id))


if __name__ == "__main__":
    main()
