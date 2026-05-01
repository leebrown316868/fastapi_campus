"""
6.3 性能测试 — 响应时间与并发访问能力
需求文档要求：接口响应时间 < 500ms
测试前请确保后端已启动: python -m uvicorn main:app --reload --port 8000

输出格式：多轮采样 → 平均值 ± 标准差 [最小值, 最大值] (ms)
"""

import time
import asyncio
import statistics
import pytest
from httpx import AsyncClient

BASE_URL = "http://localhost:8000"
RESPONSE_TIME_LIMIT = 0.5  # 500ms
ROUNDS = 10  # 每个接口采样轮次


def fmt_stats(samples_ms: list[float]) -> str:
    """格式化统计结果。"""
    avg = statistics.mean(samples_ms)
    std = statistics.stdev(samples_ms) if len(samples_ms) >= 2 else 0
    mn = min(samples_ms)
    mx = max(samples_ms)
    return f"{avg:.1f} ± {std:.1f} [{mn:.1f}, {mx:.1f}]"


@pytest.fixture
async def client():
    async with AsyncClient(base_url=BASE_URL, timeout=10.0) as ac:
        yield ac


# ── 单接口响应时间测试（多轮采样）──

@pytest.mark.parametrize("endpoint", [
    "/api/feed/latest",
    "/api/notifications",
    "/api/activities",
    "/api/search?q=校园",
])
async def test_response_time_sampling(client: AsyncClient, endpoint):
    """对主要接口进行 ROUNDS 轮采样，统计响应时间。"""
    samples = []
    for _ in range(ROUNDS):
        start = time.perf_counter()
        resp = await client.get(endpoint)
        elapsed = time.perf_counter() - start
        assert resp.status_code == 200, f"{endpoint} 返回 {resp.status_code}"
        samples.append(elapsed * 1000)

    stats = fmt_stats(samples)
    avg = statistics.mean(samples)
    print(f"\n  {endpoint}")
    print(f"    {ROUNDS}轮采样: {stats} ms")
    assert avg < RESPONSE_TIME_LIMIT * 1000, (
        f"{endpoint} 平均 {avg:.1f}ms 超过 {RESPONSE_TIME_LIMIT*1000:.0f}ms"
    )


async def test_login_response_time_sampling(client: AsyncClient):
    """登录接口多轮采样。"""
    samples = []
    for _ in range(ROUNDS):
        start = time.perf_counter()
        resp = await client.post("/api/auth/login", json={
            "username": "admin@campus.edu", "password": "admin123",
        })
        elapsed = time.perf_counter() - start
        assert resp.status_code == 200
        samples.append(elapsed * 1000)

    stats = fmt_stats(samples)
    avg = statistics.mean(samples)
    print(f"\n  POST /api/auth/login")
    print(f"    {ROUNDS}轮采样: {stats} ms")
    assert avg < RESPONSE_TIME_LIMIT * 1000


async def test_search_fulltext_response_time_sampling(client: AsyncClient):
    """FULLTEXT 搜索多轮采样。"""
    samples = []
    for _ in range(ROUNDS):
        start = time.perf_counter()
        resp = await client.get("/api/search", params={"q": "考试"})
        elapsed = time.perf_counter() - start
        assert resp.status_code == 200
        samples.append(elapsed * 1000)

    stats = fmt_stats(samples)
    avg = statistics.mean(samples)
    print(f"\n  GET /api/search?q=考试")
    print(f"    {ROUNDS}轮采样: {stats} ms")
    assert avg < RESPONSE_TIME_LIMIT * 1000


# ── 并发访问测试（多轮采样）──

CONCURRENT_USERS = 50
CONCURRENT_ROUNDS = 5


async def test_concurrent_feed(client: AsyncClient):
    """50并发Feed请求，跑5轮统计。"""
    round_times = []

    for _ in range(CONCURRENT_ROUNDS):
        async def single_request():
            resp = await client.get("/api/feed/latest")
            assert resp.status_code == 200
            return resp.json()

        start = time.perf_counter()
        results = await asyncio.gather(*[single_request() for _ in range(CONCURRENT_USERS)])
        elapsed = time.perf_counter() - start
        round_times.append(elapsed * 1000)
        assert len(results) == CONCURRENT_USERS

    stats = fmt_stats(round_times)
    print(f"\n  {CONCURRENT_USERS}并发Feed × {CONCURRENT_ROUNDS}轮")
    print(f"    总耗时: {stats} ms")
    print(f"    平均单请求: {statistics.mean(round_times)/CONCURRENT_USERS:.1f} ms")


async def test_concurrent_search(client: AsyncClient):
    """50并发搜索请求，跑5轮统计。"""
    round_times = []

    for _ in range(CONCURRENT_ROUNDS):
        async def single_request():
            resp = await client.get("/api/search", params={"q": "校园"})
            assert resp.status_code == 200
            return resp.json()

        start = time.perf_counter()
        results = await asyncio.gather(*[single_request() for _ in range(CONCURRENT_USERS)])
        elapsed = time.perf_counter() - start
        round_times.append(elapsed * 1000)
        assert len(results) == CONCURRENT_USERS

    stats = fmt_stats(round_times)
    print(f"\n  {CONCURRENT_USERS}并发搜索 × {CONCURRENT_ROUNDS}轮")
    print(f"    总耗时: {stats} ms")
    print(f"    平均单请求: {statistics.mean(round_times)/CONCURRENT_USERS:.1f} ms")


async def test_concurrent_mixed(client: AsyncClient):
    """50并发混合请求，跑5轮统计。"""
    endpoints = [
        "/api/feed/latest",
        "/api/notifications",
        "/api/activities",
        "/api/search?q=考试",
    ]
    round_times = []

    for _ in range(CONCURRENT_ROUNDS):
        async def single_request():
            import random
            ep = random.choice(endpoints)
            resp = await client.get(ep)
            assert resp.status_code == 200
            return ep

        start = time.perf_counter()
        results = await asyncio.gather(*[single_request() for _ in range(CONCURRENT_USERS)])
        elapsed = time.perf_counter() - start
        round_times.append(elapsed * 1000)
        assert len(results) == CONCURRENT_USERS

    stats = fmt_stats(round_times)
    print(f"\n  {CONCURRENT_USERS}并发混合 × {CONCURRENT_ROUNDS}轮")
    print(f"    总耗时: {stats} ms")
    print(f"    平均单请求: {statistics.mean(round_times)/CONCURRENT_USERS:.1f} ms")
