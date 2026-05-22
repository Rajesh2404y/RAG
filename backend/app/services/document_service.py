"""
Document service — upload, background ingestion, status management.

Key design decisions
────────────────────
1. upload_many() saves files + DB rows then returns 202 immediately.
2. Ingestion is dispatched via FastAPI BackgroundTasks — never awaited in the
   request handler, so the event loop is never blocked.
3. _run_ingestion() opens its OWN AsyncSession so it is completely decoupled
   from the request session that is closed when the response is sent.
4. No imports of non-existent modules (notification_service, advanced_retriever).
"""
from __future__ import annotations

import asyncio
import logging
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import BackgroundTasks, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import BASE_DIR, settings
from app.db.session import AsyncSessionLocal
from app.models.collection import Collection
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.schemas.document import DocumentUploadResponse

logger = logging.getLogger("rag.documents")

PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ── Path helpers ───────────────────────────────────────────────────────────────

def _storage_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    return root if root.is_absolute() else BASE_DIR / root


def _safe_name(filename: str | None) -> str:
    name = Path(filename or "document.pdf").name
    return name if name.lower().endswith(".pdf") else f"{name}.pdf"


def _resolve_stored_path(file_path: str) -> Path:
    path = Path(file_path)
    return path if path.is_absolute() else BASE_DIR / path


# ── Service ────────────────────────────────────────────────────────────────────

class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _owned_collection(self, collection_id: uuid.UUID, user_id: uuid.UUID) -> Collection:
        result = await self.db.execute(
            select(Collection).where(
                Collection.id == collection_id,
                Collection.owner_id == user_id,
            )
        )
        col = result.scalar_one_or_none()
        if not col:
            raise HTTPException(status_code=404, detail="Collection not found")
        return col

    # ── Upload ─────────────────────────────────────────────────────────────────

    async def upload_many(
        self,
        files: list[UploadFile],
        collection_id: uuid.UUID,
        user_id: uuid.UUID,
        background_tasks: BackgroundTasks,
    ) -> DocumentUploadResponse:
        await self._owned_collection(collection_id, user_id)

        upload_dir = _storage_root() / str(collection_id)
        upload_dir.mkdir(parents=True, exist_ok=True)

        saved: list[Document] = []

        for file in files:
            original = _safe_name(file.filename)

            # MIME + magic-bytes validation
            if file.content_type not in (None, "", "application/pdf", "application/x-pdf"):
                raise HTTPException(status_code=400, detail=f"{original}: not a PDF (wrong MIME type)")

            content = await file.read()

            if not content.startswith(b"%PDF"):
                raise HTTPException(status_code=400, detail=f"{original}: not a valid PDF (bad magic bytes)")

            if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail=f"{original}: exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit",
                )

            doc_id = uuid.uuid4()
            dest   = upload_dir / f"{doc_id}.pdf"
            dest.write_bytes(content)

            doc = Document(
                id=doc_id,
                filename=dest.name,
                original_filename=original,
                file_path=str(dest),
                file_size=len(content),
                collection_id=collection_id,
                uploaded_by=user_id,
                status=DocumentStatus.PENDING,
                processing_stage="queued",
            )
            self.db.add(doc)
            saved.append(doc)
            logger.info("UPLOAD saved document_id=%s file=%s", doc_id, dest)

        await self.db.commit()
        for doc in saved:
            await self.db.refresh(doc)

        # Dispatch background ingestion — one task per document
        for doc in saved:
            self._queue_ingestion(background_tasks, str(doc.id))
            logger.info("UPLOAD queued ingestion document_id=%s", doc.id)

        return DocumentUploadResponse(
            message=f"{len(saved)} file(s) queued for processing",
            documents=saved,
        )

    def _queue_ingestion(self, background_tasks: BackgroundTasks, document_id: str) -> None:
        if settings.USE_CELERY:
            from app.tasks.ingestion_tasks import ingest_document
            ingest_document.delay(document_id)
            return
        background_tasks.add_task(_run_ingestion, document_id)

    async def retry_ingestion(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        background_tasks: BackgroundTasks,
    ) -> Document:
        doc = await self.get_status(document_id, user_id)
        if doc.status not in {DocumentStatus.FAILED, DocumentStatus.PENDING, DocumentStatus.PROCESSING}:
            raise HTTPException(status_code=409, detail=f"Document is {doc.status}, not retryable")
        doc.status = DocumentStatus.PENDING
        doc.processing_stage = "queued"
        doc.error_message = None
        await self.db.commit()
        await self.db.refresh(doc)
        self._queue_ingestion(background_tasks, str(doc.id))
        logger.info("UPLOAD retry queued document_id=%s", doc.id)
        return doc

    async def recover_stuck(
        self,
        user_id: uuid.UUID,
        background_tasks: BackgroundTasks,
        max_age_minutes: int = 15,
    ) -> list[Document]:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
        result = await self.db.execute(
            select(Document)
            .join(Collection, Document.collection_id == Collection.id)
            .where(
                Collection.owner_id == user_id,
                Document.status.in_([DocumentStatus.PENDING, DocumentStatus.PROCESSING]),
                Document.created_at < cutoff,
            )
        )
        docs = list(result.scalars().all())
        for doc in docs:
            doc.status = DocumentStatus.PENDING
            doc.processing_stage = "queued"
            doc.error_message = None
            self._queue_ingestion(background_tasks, str(doc.id))
        await self.db.commit()
        logger.warning("UPLOAD recovered stuck documents user_id=%s count=%d", user_id, len(docs))
        return docs

    async def ingest_document(self, document_id: str) -> None:
        await _run_ingestion(document_id)

    # ── Queries ────────────────────────────────────────────────────────────────

    async def list_by_collection(
        self,
        collection_id: uuid.UUID,
        user_id: uuid.UUID,
        background_tasks: BackgroundTasks | None = None,
    ) -> list[Document]:
        await self._owned_collection(collection_id, user_id)
        result = await self.db.execute(
            select(Document)
            .where(Document.collection_id == collection_id)
            .order_by(Document.created_at.desc())
        )
        docs = list(result.scalars().all())
        if background_tasks:
            recovered = 0
            for doc in docs:
                if doc.status == DocumentStatus.PENDING and not doc.processing_stage:
                    doc.processing_stage = "queued"
                    self._queue_ingestion(background_tasks, str(doc.id))
                    recovered += 1
            if recovered:
                await self.db.commit()
                logger.warning(
                    "UPLOAD auto-requeued legacy pending documents collection_id=%s count=%d",
                    collection_id,
                    recovered,
                )
        return docs

    async def get_status(self, document_id: uuid.UUID, user_id: uuid.UUID) -> Document:
        result = await self.db.execute(
            select(Document)
            .join(Collection, Document.collection_id == Collection.id)
            .where(Document.id == document_id, Collection.owner_id == user_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc

    async def delete(self, document_id: uuid.UUID, user_id: uuid.UUID) -> None:
        doc = await self.get_status(document_id, user_id)
        # Remove vectors
        try:
            from rag.vectorstores.chroma_store import ChromaVectorStore
            ChromaVectorStore(str(doc.collection_id)).delete_document(str(doc.id))
        except Exception:
            logger.exception("Vector cleanup failed document_id=%s", doc.id)
        # Remove file
        _resolve_stored_path(doc.file_path).unlink(missing_ok=True)
        await self.db.delete(doc)
        await self.db.commit()


# ── Background ingestion (runs outside the request session) ───────────────────

async def _run_ingestion(document_id: str) -> None:
    """
    Fully self-contained ingestion coroutine.
    Opens its own DB session — completely independent of the upload request.
    """
    logger.info("INGEST start  document_id=%s", document_id)
    document_uuid = uuid.UUID(document_id)

    loop = asyncio.get_running_loop()

    async def set_stage(stage: str) -> None:
        async with AsyncSessionLocal() as stage_db:
            stage_result = await stage_db.execute(select(Document).where(Document.id == document_uuid))
            stage_doc = stage_result.scalar_one_or_none()
            if stage_doc:
                stage_doc.status = DocumentStatus.PROCESSING
                stage_doc.processing_stage = stage
                await stage_db.commit()
                logger.info("INGEST stage=%s document_id=%s", stage, document_id)

    def set_stage_from_worker(stage: str) -> None:
        future = asyncio.run_coroutine_threadsafe(set_stage(stage), loop)
        future.result(timeout=15)

    async with AsyncSessionLocal() as db:
        # 1. Load document row
        result = await db.execute(select(Document).where(Document.id == document_uuid))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error("INGEST abort  document_id=%s — row not found", document_id)
            return

        # 2. Mark processing
        doc.status = DocumentStatus.PROCESSING
        doc.processing_stage = "starting"
        doc.error_message = None
        await db.commit()
        logger.info("INGEST status=processing document_id=%s", document_id)

        try:
            # 3. Run pipeline (blocking CPU/IO — run in thread pool)
            from rag.pipelines.ingestion_pipeline import IngestionPipeline
            result_data = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: IngestionPipeline().run(
                    str(_resolve_stored_path(doc.file_path)),
                    str(doc.id),
                    str(doc.collection_id),
                    on_stage=set_stage_from_worker,
                ),
            )

            chunk_count = result_data["chunk_count"]
            if chunk_count == 0:
                raise ValueError("PDF contains no extractable text — may be image-only or corrupted")

            # 4. Persist chunk metadata to DB
            await db.execute(
                DocumentChunk.__table__.delete().where(
                    DocumentChunk.document_id == doc.id
                )
            )
            for chunk in result_data["chunks"]:
                db.add(DocumentChunk(
                    document_id=doc.id,
                    chunk_index=chunk["metadata"]["chunk_index"],
                    content=chunk["text"],
                    page_number=chunk["metadata"]["page_number"],
                    chroma_chunk_id=(
                        f"{doc.id}"
                        f"_{chunk['metadata']['page_number']}"
                        f"_{chunk['metadata']['chunk_index']}"
                    ),
                ))

            # 5. Mark ready
            doc.page_count = result_data["page_count"]
            doc.status     = DocumentStatus.READY
            doc.processing_stage = "ready"
            doc.error_message = None
            await db.commit()
            logger.info(
                "INGEST done   document_id=%s pages=%d chunks=%d",
                document_id, result_data["page_count"], chunk_count,
            )

        except Exception as exc:
            doc.status        = DocumentStatus.FAILED
            doc.processing_stage = "failed"
            doc.error_message = str(exc)[:1000]
            await db.commit()
            logger.exception("INGEST failed document_id=%s error=%s", document_id, exc)
