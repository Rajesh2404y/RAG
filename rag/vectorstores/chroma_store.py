"""
ChromaDB vector store — one persistent client, fresh collection handle per call.

The client is cached (one SQLite connection per path) but the collection is
fetched fresh every time to avoid stale handles across background tasks.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger("rag.vectorstore")


def _resolve_path(path: str) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    from app.core.config import BASE_DIR
    return BASE_DIR / candidate


@lru_cache(maxsize=1)
def _get_client(path: str) -> chromadb.PersistentClient:
    """One client per persist-dir path — safe to cache."""
    return chromadb.PersistentClient(
        path=path,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


class ChromaVectorStore:
    def __init__(self, collection_id: str):
        from app.core.config import settings
        self.collection_id = collection_id
        self.persist_dir = _resolve_path(settings.CHROMA_PERSIST_DIR)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.client = _get_client(str(self.persist_dir))
        self.collection_name = f"{settings.CHROMA_COLLECTION_PREFIX}_{collection_id}"
        # Always fetch fresh — never cache the collection handle
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    # ── Write ──────────────────────────────────────────────────────────────────

    def add_chunks_with_embeddings(self, chunks: list[dict]) -> None:
        """Upsert pre-computed embeddings — called by IngestionPipeline."""
        if not chunks:
            return
        texts      = [c["text"]      for c in chunks]
        metadatas  = [c["metadata"]  for c in chunks]
        embeddings = [c["embedding"] for c in chunks]
        ids = [
            f"{c['metadata']['document_id']}"
            f"_{c['metadata']['page_number']}"
            f"_{c['metadata']['chunk_index']}"
            for c in chunks
        ]
        self.collection.upsert(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )
        try:
            from rag.retrievers.advanced_retriever import invalidate_collection_cache
            invalidate_collection_cache(self.collection_id)
        except Exception:
            logger.exception("failed to invalidate retrieval cache collection=%s", self.collection_name)
        logger.info("upsert collection=%s n=%d", self.collection_name, len(chunks))

    def add_chunks(self, chunks: list[dict]) -> None:
        """Embed-then-upsert convenience method (used outside ingestion pipeline)."""
        if not chunks:
            return
        from app.core.config import settings
        from rag.embeddings.embedding_factory import EmbeddingFactory
        embedder = EmbeddingFactory.get(settings.EMBED_PROVIDER)
        texts = [c["text"] for c in chunks]
        embeddings = embedder.embed_documents(texts)
        for chunk, emb in zip(chunks, embeddings):
            chunk["embedding"] = emb
        self.add_chunks_with_embeddings(chunks)

    def delete_document(self, document_id: str) -> None:
        self.collection.delete(where={"document_id": document_id})
        logger.info("delete collection=%s document_id=%s", self.collection_name, document_id)

    # ── Read ───────────────────────────────────────────────────────────────────

    def query(self, query_text: str, top_k: int = 5, where: dict | None = None) -> list[dict]:
        if self.collection.count() == 0:
            return []
        from app.core.config import settings
        from rag.embeddings.embedding_factory import EmbeddingFactory
        embedder = EmbeddingFactory.get(settings.EMBED_PROVIDER)
        embedding = embedder.embed_query(query_text)
        kwargs: dict = {
            "query_embeddings": [embedding],
            "n_results": min(top_k, self.collection.count()),
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where
        results = self.collection.query(**kwargs)
        return [
            {"content": doc, "metadata": meta, "score": 1 - dist}
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
        ]

    def count(self) -> int:
        return self.collection.count()

    def get_all_chunks(self, where: dict | None = None, limit: int | None = None) -> list[dict]:
        if self.collection.count() == 0:
            return []
        kwargs: dict = {"include": ["documents", "metadatas"]}
        if where:
            kwargs["where"] = where
        if limit:
            kwargs["limit"] = limit
        results = self.collection.get(**kwargs)
        return [
            {"id": cid, "content": doc, "metadata": meta or {}}
            for cid, doc, meta in zip(
                results["ids"], results["documents"], results["metadatas"]
            )
        ]


# ── Health check ───────────────────────────────────────────────────────────────

def check_vector_store() -> dict:
    try:
        from app.core.config import settings
        persist_dir = _resolve_path(settings.CHROMA_PERSIST_DIR)
        persist_dir.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(
            path=str(persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        collections = client.list_collections()
        return {
            "ok": True,
            "persist_dir": str(persist_dir),
            "collections": [c.name for c in collections],
        }
    except Exception as exc:
        logger.exception("Vector store health check failed")
        return {"ok": False, "error": type(exc).__name__, "detail": str(exc)}
