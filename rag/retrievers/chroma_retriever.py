"""
ChromaDB retriever — wraps vector store query and formats results for the pipeline.
"""
import asyncio

from app.core.config import settings
from rag.retrievers.advanced_retriever import HybridRetriever, RetrievalOptions
from rag.vectorstores.chroma_store import ChromaVectorStore


class ChromaRetriever:
    def __init__(self, collection_id: str):
        self.collection_id = collection_id
        self.store = ChromaVectorStore(collection_id)

    async def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        result = await HybridRetriever(self.collection_id).retrieve(
            query,
            options=RetrievalOptions(top_k=top_k, candidate_k=max(settings.RETRIEVAL_CANDIDATE_K, top_k)),
        )
        return result["chunks"]

    async def vector_only(self, query: str, top_k: int = 5) -> list[dict]:
        raw = await asyncio.to_thread(self.store.query, query, top_k)
        return [_format_raw_result(r) for r in raw]


def _format_raw_result(result: dict) -> dict:
    metadata = result["metadata"]
    return {
        "chunk_id": f"{metadata['document_id']}_{metadata['page_number']}_{metadata.get('chunk_index', 0)}",
        "content": result["content"],
        "document_id": metadata["document_id"],
        "filename": metadata["filename"],
        "page_number": metadata.get("page_number"),
        "score": result["score"],
    }
