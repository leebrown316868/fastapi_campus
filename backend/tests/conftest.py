"""
测试配置 — 连接本地已运行的后端服务 (http://localhost:8000)。
测试前请确保后端已启动: python -m uvicorn main:app --reload --port 8000
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

BASE_URL = "http://localhost:8000"


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={
        "username": "admin@campus.edu",
        "password": "admin123",
    })
    assert resp.status_code == 200, "admin login failed, is the backend running?"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def user_token(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={
        "username": "student@campus.edu",
        "password": "student123",
    })
    assert resp.status_code == 200, "student login failed, is the backend running?"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_headers(admin_token: str):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def user_headers(user_token: str):
    return {"Authorization": f"Bearer {user_token}"}
