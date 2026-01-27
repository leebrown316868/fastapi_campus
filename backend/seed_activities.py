"""
Script to generate 20 random activities for testing.
Run this after starting the backend server.
"""
import urllib.request
import urllib.parse
import json
import random
import sys
from datetime import datetime, timedelta

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# API configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
ACTIVITIES_URL = f"{BASE_URL}/api/activities"

# Login credentials (admin)
# Note: login API expects 'username' field (can be email or student_id)
ADMIN_CREDENTIALS = {
    "username": "admin@campus.edu",
    "password": "admin123"
}

# Activity data pools
CATEGORIES = ["学术讲座", "文艺演出", "体育赛事", "社团活动", "志愿服务", "就业招聘"]
LOCATIONS = ["图书馆报告厅", "学生活动中心", "体育馆", "教学楼A101", "大礼堂", "操场", "创业园"]
ORGANIZERS = ["学生会", "团委", "就业指导中心", "体育部", "文艺部", "志愿者协会", "创业社团"]

TITLE_TEMPLATES = [
    "{category}：{topic}",
    "{category}系列之{topic}",
    "{category}——{topic}",
    "精彩{category}：{topic}等你来",
]

TOPICS = {
    "学术讲座": ["人工智能前沿技术", "量子计算导论", "大数据分析实战", "Python编程进阶", "科研论文写作", "创新创业论坛"],
    "文艺演出": ["校园十佳歌手大赛", "话剧展演", "乐器演奏会", "街舞battle", "相声小品专场", "新年音乐会"],
    "体育赛事": ["篮球联赛决赛", "足球友谊赛", "羽毛球锦标赛", "田径运动会", "游泳比赛", "电竞比赛"],
    "社团活动": ["动漫社展会", "摄影社外拍", "辩论赛决赛", "棋类大赛", "读书分享会", "手工DIY"],
    "志愿服务": ["敬老院慰问", "环保公益活动", "支教宣讲会", "献血活动", "社区服务", "绿色校园行动"],
    "就业招聘": ["春季校园招聘会", "名企宣讲会", "简历制作工作坊", "面试技巧培训", "实习对接会", "职业规划讲座"],
}

DESCRIPTIONS = [
    "本次活动将邀请专家进行深入讲解，欢迎广大师生踊跃参加！",
    "机会难得，名额有限，先到先得！",
    "精彩不容错过，期待你的到来！",
    "活动内容丰富，互动环节多多，还有精美礼品等你拿！",
    "这是一个学习交流的好机会，欢迎大家积极参与！",
    "通过本次活动，你将收获满满，干货多多！",
]

def generate_random_activity(index: int) -> dict:
    """Generate a random activity."""
    category = random.choice(CATEGORIES)
    topic = random.choice(TOPICS[category])
    title_template = random.choice(TITLE_TEMPLATES)
    title = title_template.format(category=category, topic=topic)
    description = random.choice(DESCRIPTIONS)

    # Generate random date (within next 30 days)
    days_from_now = random.randint(0, 30)
    activity_date = datetime.now() + timedelta(days=days_from_now, hours=random.randint(9, 20))
    activity_end = activity_date + timedelta(hours=random.randint(1, 3))

    # Random images (placeholder URLs)
    IMAGES = [
        "https://via.placeholder.com/800x400/4F46E5/ffffff?text=Activity",
        "https://via.placeholder.com/800x400/059669/ffffff?text=Activity",
        "https://via.placeholder.com/800x400/DC2626/ffffff?text=Activity",
        "https://via.placeholder.com/800x400/D97706/ffffff?text=Activity",
        "https://via.placeholder.com/800x400/7C3AED/ffffff?text=Activity",
    ]

    return {
        "title": title,
        "description": description,
        "category": category,
        "location": random.choice(LOCATIONS),
        "organizer": random.choice(ORGANIZERS),
        "image": random.choice(IMAGES),
        "capacity": random.choice([0, 50, 100, 200, 500]),
        "date": activity_date.strftime("%Y-%m-%d"),  # Legacy display date
        "activity_start": activity_date.isoformat(),
        "activity_end": activity_end.isoformat(),
        "registration_start": (activity_date - timedelta(days=7)).isoformat(),
        "registration_end": activity_date.isoformat(),
        "status": "报名中",
    }

def main():
    """Main function to seed activities."""
    print("[*] Logging in as admin...")

    # Login request
    login_data = json.dumps(ADMIN_CREDENTIALS).encode('utf-8')
    login_req = urllib.request.Request(
        LOGIN_URL,
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(login_req) as response:
            login_response = json.loads(response.read().decode('utf-8'))
            token = login_response.get("access_token")
    except urllib.error.HTTPError as e:
        print(f"[X] Login failed: {e.code}")
        print(e.read().decode())
        return
    except urllib.error.URLError as e:
        print(f"[X] Cannot connect to backend server. Is it running on {BASE_URL}?")
        print(f"    Error: {e.reason}")
        return

    print("[OK] Login successful!")
    print("[*] Creating 20 random activities...\n")

    success_count = 0
    failed_count = 0

    for i in range(1, 21):
        activity_data = generate_random_activity(i)
        activity_json = json.dumps(activity_data).encode('utf-8')

        activity_req = urllib.request.Request(
            ACTIVITIES_URL,
            data=activity_json,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }
        )

        try:
            with urllib.request.urlopen(activity_req) as response:
                activity = json.loads(response.read().decode('utf-8'))
                print(f"[OK] [{i}/20] Created: {activity['title'][:40]}... ({activity['date']})")
                success_count += 1
        except urllib.error.HTTPError as e:
            print(f"[X] [{i}/20] Failed to create activity: {e.code}")
            print(f"     Error: {e.read().decode()}")
            failed_count += 1

    print(f"\n{'='*60}")
    print(f"[INFO] Summary: {success_count} created, {failed_count} failed")
    print(f"{'='*60}")

    # Verify total count
    print("\n[*] Verifying total activities count...")
    try:
        with urllib.request.urlopen(ACTIVITIES_URL) as response:
            activities = json.loads(response.read().decode('utf-8'))
            print(f"[INFO] Total activities in database: {len(activities)}")
    except Exception as e:
        print(f"[X] Failed to verify count: {e}")

if __name__ == "__main__":
    main()
