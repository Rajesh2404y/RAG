"""
Celery tasks for document ingestion.
"""
import asyncio

from app.core.logging import logger
from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def ingest_document(self, document_id: str):
    try:
        from app.db.session import AsyncSessionLocal
        from app.services.document_service import DocumentService

        async def _run():
            async with AsyncSessionLocal() as db:
                await DocumentService(db).ingest_document(document_id)

        asyncio.run(_run())
        logger.info("Ingested document %s", document_id)
    except Exception as exc:
        logger.exception("Ingestion failed for %s", document_id)
        raise self.retry(exc=exc)
