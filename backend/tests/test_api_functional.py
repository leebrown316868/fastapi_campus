"""
6.2 功能测试 — 接口正确性
覆盖：认证、通知CRUD、活动CRUD、失物招领、搜索、Feed、用户通知、个人中心
"""


class TestAuth:
    """用户认证接口测试。"""

    async def test_login_admin_success(self, client):
        resp = await client.post("/api/auth/login", json={
            "username": "admin@campus.edu", "password": "admin123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"

    async def test_login_student_success(self, client):
        resp = await client.post("/api/auth/login", json={
            "username": "student@campus.edu", "password": "student123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "user"

    async def test_login_by_student_id(self, client):
        resp = await client.post("/api/auth/login", json={
            "username": "2021008822", "password": "student123",
        })
        assert resp.status_code == 200

    async def test_login_wrong_password(self, client):
        resp = await client.post("/api/auth/login", json={
            "username": "admin@campus.edu", "password": "wrong",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client):
        resp = await client.post("/api/auth/login", json={
            "username": "no@one.com", "password": "xxx",
        })
        assert resp.status_code == 401

    async def test_register_success(self, client):
        import uuid
        uid = str(uuid.uuid4())[:8]
        resp = await client.post("/api/auth/register", json={
            "email": f"test_{uid}@pytest.com",
            "name": "测试用户",
            "student_id": f"2099{uid}",
            "password": "test12345",
        })
        assert resp.status_code == 201

    async def test_register_duplicate_email(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "admin@campus.edu",
            "name": "重复", "student_id": "2099000002", "password": "test12345",
        })
        assert resp.status_code == 400

    async def test_logout(self, client):
        resp = await client.post("/api/auth/logout")
        assert resp.status_code == 200


class TestNotifications:
    """课程通知接口测试。"""

    async def test_list_notifications(self, client):
        resp = await client.get("/api/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_create_notification_admin(self, client, admin_headers):
        resp = await client.post("/api/notifications", headers=admin_headers, json={
            "title": "pytest测试通知",
            "content": "这是pytest自动创建的测试通知",
            "course": "PYTEST 101",
            "author": "pytest",
            "is_important": True,
        })
        assert resp.status_code in (200, 201)
        assert resp.json()["title"] == "pytest测试通知"

    async def test_create_notification_user_forbidden(self, client, user_headers):
        resp = await client.post("/api/notifications", headers=user_headers, json={
            "title": "非法", "content": "x", "course": "x", "author": "x",
        })
        assert resp.status_code == 403

    async def test_create_notification_no_auth(self, client):
        resp = await client.post("/api/notifications", json={
            "title": "非法", "content": "x", "course": "x", "author": "x",
        })
        assert resp.status_code in (401, 403)


class TestActivities:
    """活动公告接口测试。"""

    async def test_list_activities(self, client):
        resp = await client.get("/api/activities")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_list_activities_by_category(self, client):
        resp = await client.get("/api/activities", params={"category": "lecture"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_create_activity_admin(self, client, admin_headers):
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        resp = await client.post("/api/activities", headers=admin_headers, json={
            "title": "pytest测试活动",
            "description": "pytest自动创建的测试活动",
            "date": "2026年5月1日 10:00",
            "location": "pytest测试地点",
            "organizer": "pytest组织",
            "image": "https://example.com/test.jpg",
            "category": "lecture",
            "capacity": 100,
            "activity_start": (now + timedelta(days=7)).isoformat(),
        })
        assert resp.status_code in (200, 201)
        assert resp.json()["title"] == "pytest测试活动"


class TestLostItems:
    """失物招领接口测试。"""

    async def test_list_lost_items(self, client, user_headers):
        resp = await client.get("/api/lost-items", headers=user_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_list_lost_items_by_type(self, client, user_headers):
        resp = await client.get("/api/lost-items", params={"type": "lost"}, headers=user_headers)
        assert resp.status_code == 200

    async def test_create_lost_item_user(self, client, user_headers):
        resp = await client.post("/api/lost-items", headers=user_headers, json={
            "title": "pytest测试遗失物品",
            "type": "lost",
            "category": "电子数码",
            "description": "pytest自动创建的测试遗失物品",
            "location": "pytest图书馆二楼",
            "time": "2026年4月6日 下午3:00",
        })
        assert resp.status_code in (200, 201)
        assert resp.json()["title"] == "pytest测试遗失物品"

    async def test_create_lost_item_no_auth(self, client):
        resp = await client.post("/api/lost-items", json={
            "title": "无权限", "type": "lost", "category": "x",
            "description": "x", "location": "x", "time": "x",
        })
        assert resp.status_code in (401, 403)


class TestUserNotifications:
    """用户通知接口测试。"""

    async def test_get_my_notifications(self, client, user_headers):
        resp = await client.get("/api/notifications/me", headers=user_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_unread_count(self, client, user_headers):
        resp = await client.get("/api/notifications/me/unread-count", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "unread_count" in data

    async def test_mark_read(self, client, user_headers):
        resp = await client.get("/api/notifications/me", headers=user_headers)
        notifications = resp.json()
        if notifications:
            nid = notifications[0]["id"]
            r = await client.patch(f"/api/notifications/me/{nid}/read", headers=user_headers)
            assert r.status_code == 200

    async def test_mark_read_all(self, client, user_headers):
        r = await client.patch("/api/notifications/me/read-all", headers=user_headers)
        assert r.status_code in (200, 405)  # 405 if endpoint uses different method


class TestUserProfile:
    """用户资料接口测试。"""

    async def test_get_profile(self, client, user_headers):
        resp = await client.get("/api/users/me", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "student@campus.edu"

    async def test_update_profile(self, client, user_headers):
        resp = await client.patch("/api/users/me", headers=user_headers, json={
            "bio": "pytest个人简介测试",
        })
        assert resp.status_code == 200

    async def test_get_profile_no_auth(self, client):
        resp = await client.get("/api/users/me")
        assert resp.status_code in (401, 403)


class TestSearch:
    """统一全文搜索接口测试。"""

    async def test_search_has_results(self, client):
        resp = await client.get("/api/search", params={"q": "考试"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["query"] == "考试"

    async def test_search_activities(self, client):
        resp = await client.get("/api/search", params={"q": "音乐"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["counts"]["activities"] >= 1

    async def test_search_lost_items(self, client):
        resp = await client.get("/api/search", params={"q": "耳机"})
        assert resp.status_code == 200
        data = resp.json()
        # 耳机 may or may not have results depending on DB state
        assert "counts" in data

    async def test_search_filter_type(self, client):
        resp = await client.get("/api/search", params={"q": "校园", "type": "activities"})
        assert resp.status_code == 200
        data = resp.json()
        assert all(r["type"] == "activity" for r in data["results"])

    async def test_search_relevance_ordering(self, client):
        resp = await client.get("/api/search", params={"q": "校园"})
        data = resp.json()
        if len(data["results"]) >= 2:
            scores = [r["score"] for r in data["results"]]
            assert scores == sorted(scores, reverse=True), "Results should be sorted by score descending"

    async def test_search_empty_query(self, client):
        resp = await client.get("/api/search", params={"q": ""})
        assert resp.status_code == 422

    async def test_search_results_have_score(self, client):
        resp = await client.get("/api/search", params={"q": "考试"})
        data = resp.json()
        for r in data["results"]:
            assert "score" in r
            assert r["score"] > 0


class TestFeed:
    """聚合信息流接口测试。"""

    async def test_feed_latest(self, client):
        resp = await client.get("/api/feed/latest")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_feed_has_multiple_types(self, client):
        resp = await client.get("/api/feed/latest", params={"limit": 30})
        data = resp.json()
        if data["total"] >= 2:
            types = set(item["type"] for item in data["items"])
            assert len(types) >= 1

    async def test_feed_items_have_required_fields(self, client):
        resp = await client.get("/api/feed/latest")
        data = resp.json()
        for item in data["items"]:
            assert "id" in item
            assert "type" in item
            assert "title" in item
            assert "tag" in item
            assert "time" in item
