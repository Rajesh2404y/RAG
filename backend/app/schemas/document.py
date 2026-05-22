"""
Pydantic schemas for Document upload and responses.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    file_size: int | None
    page_count: int | None
    status: str
    processing_stage: str | None = None
    error_message: str | None = None
    collection_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUploadResponse(BaseModel):
    message: str
    documents: list[DocumentResponse]
