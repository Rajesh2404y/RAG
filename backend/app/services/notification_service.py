"""
Notification service - durable notification persistence with websocket-ready shape.
"""
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, payload: NotificationCreate, commit: bool = True) -> Notification:
        notification = Notification(user_id=user_id, **payload.model_dump())
        self.db.add(notification)
        if commit:
            await self.db.commit()
            await self.db.refresh(notification)
        return notification

    async def list(self, user_id: uuid.UUID, limit: int = 30, unread_only: bool = False) -> tuple[list[Notification], int]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        result = await self.db.execute(stmt.order_by(Notification.created_at.desc()).limit(min(limit, 100)))
        unread_result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return list(result.scalars().all()), int(unread_result.scalar_one())

    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        await self.db.commit()

    async def mark_all_read(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        await self.db.commit()
