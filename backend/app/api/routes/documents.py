"""
Document routes — upload, list, status polling, delete.

Route layout (no path conflicts):
  POST   /upload/{collection_id}          — multi-file upload
  GET    /collection/{collection_id}      — list docs in a collection
  GET    /doc/{document_id}/status        — poll ingestion status
  DELETE /doc/{document_id}              — delete doc + vectors
"""
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentUploadResponse
from app.services.document_service import DocumentService

router = APIRouter()


@router.post(
    "/upload/{collection_id}",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_documents(
    collection_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DocumentService(db).upload_many(
        files, collection_id, current_user.id, background_tasks
    )


@router.get("/collection/{collection_id}", response_model=list[DocumentResponse])
async def list_documents(
    collection_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DocumentService(db).list_by_collection(collection_id, current_user.id, background_tasks)


@router.get("/doc/{document_id}/status", response_model=DocumentResponse)
async def document_status(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DocumentService(db).get_status(document_id, user_id=current_user.id)


@router.post("/doc/{document_id}/retry", response_model=DocumentResponse)
async def retry_document(
    document_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DocumentService(db).retry_ingestion(document_id, current_user.id, background_tasks)


@router.post("/recover-stuck", response_model=list[DocumentResponse])
async def recover_stuck_documents(
    background_tasks: BackgroundTasks,
    max_age_minutes: int = 15,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DocumentService(db).recover_stuck(current_user.id, background_tasks, max_age_minutes)


@router.delete("/doc/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DocumentService(db).delete(document_id, current_user.id)
