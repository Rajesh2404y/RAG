"""
Pydantic schemas for durable notifications.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel


class NotificationCreate(BaseModel):
    type: str = "info"
    title: str
    message: str
    entity_type: str | None = None
    entity_id: str | None = None


class NotificationResponse(NotificationCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int
