"""
Search service - validates collection ownership and delegates semantic search to Chroma.
"""
import logging
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Collection
from app.models.document import Document, DocumentStatus
from app.schemas.chat import SearchRequest, SearchResult

logger = logging.getLogger("rag.search")


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, payload: SearchRequest, user_id: uuid.UUID) -> list[SearchResult]:
        if payload.collection_id:
            result = await self.db.execute(
                select(Collection).where(Collection.id == payload.collection_id, Collection.owner_id == user_id)
            )
            collection = result.scalar_one_or_none()
            if not collection:
                raise HTTPException(status_code=404, detail="Collection not found")
            collection_ids = [payload.collection_id]
        else:
            result = await self.db.execute(select(Collection.id).where(Collection.owner_id == user_id))
            collection_ids = list(result.scalars().all())

        if not collection_ids:
            return []

        count_result = await self.db.execute(
            select(Document.collection_id).where(
                Document.collection_id.in_(collection_ids),
                Document.status == DocumentStatus.READY,
            ).distinct()
        )
        ready_collection_ids = list(count_result.scalars().all())
        if not ready_collection_ids:
            logger.info("Search skipped for workspace user_id=%s", user_id)
            return []

        from rag.retrievers.chroma_retriever import ChromaRetriever

        raw_results = []
        for collection_id in ready_collection_ids:
            retriever = ChromaRetriever(collection_id=str(collection_id))
            raw_results.extend(await retriever.retrieve(payload.query, top_k=payload.top_k))
        raw_results.sort(key=lambda item: item["score"], reverse=True)
        return [SearchResult(**r) for r in raw_results[: payload.top_k]]
