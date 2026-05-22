"""
Pydantic schemas for Chat sessions and messages.
"""
import uuid
import json
from typing import Any
from datetime import datetime
from pydantic import BaseModel, field_validator


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    sources: list[dict[str, Any]] | None = None
    created_at: datetime

    @field_validator("sources", mode="before")
    @classmethod
    def parse_sources(cls, value):
        if value in (None, ""):
            return []
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return []
        return value

    model_config = {"from_attributes": True}


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    collection_id: uuid.UUID | None
    created_at: datetime
    messages: list[ChatMessageResponse] = []

    model_config = {"from_attributes": True}


class ChatSessionUpdate(BaseModel):
    title: str


class ChatRequest(BaseModel):
    session_id: uuid.UUID | None = None
    collection_id: uuid.UUID
    message: str
    stream: bool = False


class SearchRequest(BaseModel):
    collection_id: uuid.UUID | None = None
    query: str
    top_k: int = 5


class SearchResult(BaseModel):
    chunk_id: str
    content: str
    document_id: str
    filename: str
    page_number: int | None
    score: float
