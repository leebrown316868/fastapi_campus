"""
Initialize database with admin user.
Run this script to create the database and default admin user.
"""
import asyncio
import sys
import io

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import engine, async_session_maker, Base
from app.models import User, Notification, Activity, LostItem
from app.core.security import get_password_hash


async def create_admin_user():
    """Create default admin user."""
    async with async_session_maker() as session:
        # Check if admin already exists
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.email == "admin@campus.edu")
        )
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                email="admin@campus.edu",
                student_id="ADMIN001",
                name="系统管理员",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True,
                is_verified=True,
            )
            session.add(admin)
            await session.commit()
            print("[OK] Admin user created")
            print("  Email: admin@campus.edu")
            print("  Password: admin123")
        else:
            print("[OK] Admin user already exists")

        # Create test user
        result = await session.execute(
            select(User).where(User.email == "student@campus.edu")
        )
        student = result.scalar_one_or_none()

        if not student:
            student = User(
                email="student@campus.edu",
                student_id="2021008822",
                name="张同学",
                hashed_password=get_password_hash("student123"),
                role="user",
                is_active=True,
                is_verified=True,
                major="计算机科学与技术",
                bio="大三在读，喜欢摄影和编程。",
            )
            session.add(student)
            await session.commit()
            print("[OK] Test student user created")
            print("  Email: student@campus.edu")
            print("  Password: student123")
        else:
            print("[OK] Test student user already exists")

        # Create sample notifications
        from sqlalchemy import func
        notification_count = await session.execute(
            select(func.count(Notification.id))
        )
        if notification_count.scalar() == 0:
            notifications = [
                Notification(
                    title="期中考试时间调整通知",
                    content="由于科学楼突发停电，原定于本周五的期中考试已推迟至下周一上午10:00。请查看更新后的教学大纲。",
                    course="CS 101: 计算机科学导论",
                    author="Alan Grant 教授",
                    avatar="https://lh3.googleusercontent.com/a/default-user=s96-c",
                    location="主楼 304 教室",
                    is_important=True,
                ),
                Notification(
                    title="项目提交截止日期延长",
                    content="大家好，我收到了多份关于延长最终项目截止日期的申请。现将截止日期推迟至周日午夜。祝大家好运！",
                    course="ART 204: 现代设计",
                    author="Frizzle 女士",
                    avatar="https://lh3.googleusercontent.com/a/default-user=s96-c",
                    location="在线门户",
                    is_important=False,
                ),
            ]
            for notification in notifications:
                session.add(notification)
            await session.commit()
            print("[OK] Sample notifications created")
        else:
            print("[OK] Notifications already exist")

        # Create sample activities
        activity_count = await session.execute(
            select(func.count(Activity.id))
        )
        if activity_count.scalar() == 0:
            activities = [
                Activity(
                    title="2024 校园春季音乐节",
                    description="汇集校园顶尖乐队与歌手，为你带来一场视听盛宴。现场更有抽奖环节！",
                    date="2024年11月15日 19:00",
                    location="大礼堂",
                    organizer="学生艺术团",
                    image="https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=2070&auto=format&fit=crop",
                    category="文艺",
                    status="报名中",
                ),
                Activity(
                    title="人工智能前沿技术讲座",
                    description="特邀行业专家深入探讨生成式AI的未来发展及其对社会的影响。",
                    date="2024年11月18日 14:30",
                    location="图书馆报告厅",
                    organizer="计算机学院",
                    image="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop",
                    category="讲座",
                    status="进行中",
                ),
                Activity(
                    title="校园马拉松接力赛",
                    description="挥洒汗水，展现团队力量。欢迎各院系组队报名参加。",
                    date="2024年11月20日 08:00",
                    location="北操场",
                    organizer="体育部",
                    image="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=2070&auto=format&fit=crop",
                    category="体育",
                    status="报名中",
                ),
            ]
            for activity in activities:
                session.add(activity)
            await session.commit()
            print("[OK] Sample activities created")
        else:
            print("[OK] Activities already exist")

        # Create sample lost items
        lost_item_count = await session.execute(
            select(func.count(LostItem.id))
        )
        if lost_item_count.scalar() == 0:
            # Get student user for created_by
            student_result = await session.execute(
                select(User).where(User.email == "student@campus.edu")
            )
            student = student_result.scalar_one()

            lost_items = [
                LostItem(
                    title="苹果 AirPods Pro 耳机 (第二代)",
                    type="lost",
                    category="电子数码",
                    description="复习化学期中考时，我把耳机忘在了窗边的桌子上。充电盒正面有明显的""S.K.""刻字。",
                    location="学生活动中心 二楼餐厅",
                    time="2024年10月24日 下午 2:00",
                    images=["https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=1000&auto=format&fit=crop"],
                    tags=["白色", "电子产品", "有刻字"],
                    status="寻找中",
                    created_by=student.id,
                ),
                LostItem(
                    title="蓝色水壶招领",
                    type="found",
                    category="生活用品",
                    description="在B教学楼第4排附近发现一个蓝色金属水壶。上面贴有贴纸。",
                    location="B教学楼 第4排",
                    time="2024年10月25日 上午 10:00",
                    images=["https://images.unsplash.com/photo-1602143407151-01114192003f?q=80&w=1000&auto=format&fit=crop"],
                    tags=["蓝色", "水壶", "有贴纸"],
                    status="已找到",
                    created_by=student.id,
                ),
            ]
            for item in lost_items:
                session.add(item)
            await session.commit()
            print("[OK] Sample lost items created")
        else:
            print("[OK] Lost items already exist")


async def main():
    """Main initialization function."""
    print("Initializing database...")

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created")

    # Create admin user
    await create_admin_user()

    print("\n[OK] Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())
