"""WebSocket 实时通知推送模块。

提供基于 WebSocket 的实时通知推送能力，替代前端 30 秒轮询。
使用内存字典管理在线用户连接，通过 JWT query parameter 认证。
"""
import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func

from app.core.security import decode_access_token
from app.db.database import async_session_maker
from app.models.user import User
from app.models.user_notification import UserNotification

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """管理 WebSocket 连接，支持按 user_id 定向推送。"""

    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """建立连接，同一用户重连时关闭旧连接。"""
        if user_id in self.active_connections:
            old_ws = self.active_connections[user_id]
            try:
                await old_ws.close(code=4000, reason="replaced_by_new_connection")
            except Exception:
                pass
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info("WebSocket connected: user_id=%d, total=%d", user_id, len(self.active_connections))

    def disconnect(self, user_id: int):
        """断开连接。"""
        self.active_connections.pop(user_id, None)
        logger.info("WebSocket disconnected: user_id=%d, total=%d", user_id, len(self.active_connections))

    async def send_to_user(self, user_id: int, message: dict):
        """向指定用户发送 JSON 消息。连接断开时静默处理。"""
        websocket = self.active_connections.get(user_id)
        if websocket is None:
            return
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(user_id)

    async def broadcast(self, message: dict):
        """向所有在线用户广播。"""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)


# 模块级单例
manager = ConnectionManager()


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket 通知端点。

    认证方式：query parameter ?token=<jwt>
    连接后立即发送当前未读数，之后通过 receive 循环保持连接。
    """
    # 1. 从 query parameter 提取并验证 token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="missing_token")
        return

    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4001, reason="invalid_token")
        return

    user_id: int | None = payload.get("sub")
    if user_id is None:
        await websocket.close(code=4001, reason="invalid_token_payload")
        return

    # 2. 查询用户
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            await websocket.close(code=4001, reason="user_not_found")
            return

    # 3. 建立连接
    await manager.connect(user_id, websocket)

    # 4. 发送当前未读数
    try:
        async with async_session_maker() as db:
            count_result = await db.execute(
                select(func.count()).select_from(UserNotification).where(
                    UserNotification.user_id == user_id,
                    UserNotification.is_read == False,
                )
            )
            unread_count = count_result.scalar() or 0
        await manager.send_to_user(user_id, {
            "type": "connection_established",
            "data": {"unread_count": unread_count},
        })
    except Exception:
        manager.disconnect(user_id)
        return

    # 5. 保持连接 + 心跳
    try:
        while True:
            # 接收客户端消息（用于心跳），设置 30s 超时
            data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            if data == "ping":
                await websocket.send_text("pong")
    except asyncio.TimeoutError:
        # 30s 无消息，发送一次 ping 检测连接
        try:
            await websocket.send_text("ping")
        except Exception:
            pass
        manager.disconnect(user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception:
        manager.disconnect(user_id)
