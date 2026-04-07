"""
6.3 性能测试 — 响应时间与并发访问能力
需求文档要求：接口响应时间 < 500ms
测试前请确保后端已启动: python -m uvicorn main:app --reload --port 8000
"""
import time
import asyncio
import pytest
from httpx import AsyncClient

BASE_URL = "http://localhost:8000"


@pytest.fixture
async def client():
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as ac:
        yield ac


# ── 响应时间测试 ──

RESPONSE_TIME_LIMIT = 0.5  # 500ms


@pytest.mark.parametrize("endpoint", [
    "/api/feed/latest",
    "/api/notifications",
    "/api/activities",
    "/api/search?q=校园",
])
async def test_response_time_under_500ms(client: AsyncClient, endpoint):
    """各主要接口响应时间应低于 500ms。"""
    start = time.perf_counter()
    resp = await client.get(endpoint)
    elapsed = time.perf_counter() - start

    assert resp.status_code == 200, f"{endpoint} 返回 {resp.status_code}"
    assert elapsed < RESPONSE_TIME_LIMIT, (
        f"{endpoint} 响应时间 {elapsed*1000:.0f}ms 超过 {RESPONSE_TIME_LIMIT*1000:.0f}ms"
    )


async def test_login_response_time(client: AsyncClient):
    """登录接口响应时间应低于 500ms。"""
    start = time.perf_counter()
    resp = await client.post("/api/auth/login", json={
        "username": "admin@campus.edu", "password": "admin123",
    })
    elapsed = time.perf_counter() - start
    assert resp.status_code == 200
    assert elapsed < RESPONSE_TIME_LIMIT, f"登录 {elapsed*1000:.0f}ms"


async def test_search_fulltext_response_time(client: AsyncClient):
    """FULLTEXT 搜索响应时间应低于 500ms。"""
    start = time.perf_counter()
    resp = await client.get("/api/search", params={"q": "考试"})
    elapsed = time.perf_counter() - start
    assert resp.status_code == 200
    assert elapsed < RESPONSE_TIME_LIMIT, f"搜索 {elapsed*1000:.0f}ms"


# ── 并发访问测试 ──

CONCURRENT_USERS = 20


async def test_concurrent_feed_requests(client: AsyncClient):
    """20个用户同时请求首页Feed，所有请求应成功。"""
    async def single_request():
        resp = await client.get("/api/feed/latest")
        assert resp.status_code == 200
        return resp.json()

    start = time.perf_counter()
    results = await asyncio.gather(*[single_request() for _ in range(CONCURRENT_USERS)])
    elapsed = time.perf_counter() - start

    assert len(results) == CONCURRENT_USERS
    print(f"\n  {CONCURRENT_USERS} 并发Feed请求: {elapsed*1000:.0f}ms (平均 {elapsed/CONCURRENT_USERS*1000:.0f}ms/请求)")


async def test_concurrent_search_requests(client: AsyncClient):
    """20个用户同时搜索，所有请求应成功。"""
    async def single_request():
        resp = await client.get("/api/search", params={"q": "校园"})
        assert resp.status_code == 200
        return resp.json()

    start = time.perf_counter()
    results = await asyncio.gather(*[single_request() for _ in range(CONCURRENT_USERS)])
    elapsed = time.perf_counter() - start

    assert len(results) == CONCURRENT_USERS
    print(f"\n  {CONCURRENT_USERS} 并发搜索请求: {elapsed*1000:.0f}ms (平均 {elapsed/CONCURRENT_USERS*1000:.0f}ms/请求)")


async def test_concurrent_mixed_requests(client: AsyncClient):
    """模拟20个用户混合请求（Feed + 通知 + 活动 + 搜索）。"""
    endpoints = [
        "/api/feed/latest",
        "/api/notifications",
        "/api/activities",
        "/api/search?q=考试",
    ]

    async def single_request():
        import random
        ep = random.choice(endpoints)
        resp = await client.get(ep)
        assert resp.status_code == 200
        return ep

    start = time.perf_counter()
    results = await asyncio.gather(*[single_request() for _ in range(CONCURRENT_USERS)])
    elapsed = time.perf_counter() - start

    assert len(results) == CONCURRENT_USERS
    print(f"\n  {CONCURRENT_USERS} 并发混合请求: {elapsed*1000:.0f}ms (平均 {elapsed/CONCURRENT_USERS*1000:.0f}ms/请求)")
