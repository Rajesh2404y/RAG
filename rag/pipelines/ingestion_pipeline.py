"""
Ingestion pipeline — load → chunk → embed (batched + retry) → upsert.

Stages are isolated so a failure in embedding does not discard already-parsed
chunks.  Embedding is batched in groups of BATCH_SIZE with exponential-backoff
retry so a transient Ollama timeout never kills the whole job.
"""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from rag.chunking.text_chunker import DocumentChunker
from rag.loaders.pdf_loader import PDFLoader, PageContent

if TYPE_CHECKING:
    pass

logger = logging.getLogger("rag.ingestion")

BATCH_SIZE   = 32   # chunks per embedding call
MAX_RETRIES  = 3
BACKOFF_BASE = 2.0  # seconds


def _embed_with_retry(embedder, texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts with exponential-backoff retry."""
    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            return embedder.embed_documents(texts)
        except Exception as exc:
            last_exc = exc
            wait = BACKOFF_BASE ** attempt
            logger.warning(
                "Embedding attempt %d/%d failed (%s) — retrying in %.1fs",
                attempt + 1, MAX_RETRIES, exc, wait,
            )
            time.sleep(wait)
    raise RuntimeError(f"Embedding failed after {MAX_RETRIES} attempts: {last_exc}") from last_exc


class IngestionPipeline:
    def __init__(self):
        self.loader  = PDFLoader()
        self.chunker = DocumentChunker()

    def run(self, file_path: str, document_id: str, collection_id: str, on_stage=None) -> dict:
        # ── Stage 1: Parse ────────────────────────────────────────────────────
        if on_stage:
            on_stage("parsing_pdf")
        logger.info("PARSE  start  document_id=%s", document_id)
        pages: list[PageContent] = self.loader.load(file_path, document_id)
        page_count = len(pages)
        logger.info("PARSE  done   document_id=%s pages=%d", document_id, page_count)

        # ── Stage 2: Chunk ────────────────────────────────────────────────────
        if on_stage:
            on_stage("chunking")
        logger.info("CHUNK  start  document_id=%s", document_id)
        raw_chunks = self.chunker.chunk(pages)
        chunks = [c for c in raw_chunks if c["text"].strip()]
        logger.info("CHUNK  done   document_id=%s chunks=%d", document_id, len(chunks))

        if not chunks:
            logger.warning("CHUNK  empty  document_id=%s — no text extracted", document_id)
            return {"chunk_count": 0, "page_count": page_count, "chunks": []}
        oversized = [c for c in chunks if len(c["text"]) > 12000]
        if oversized:
            raise ValueError(f"Chunking produced {len(oversized)} oversized chunks")

        # ── Stage 3: Embed + Upsert (batched) ─────────────────────────────────
        from app.core.config import settings
        from rag.embeddings.embedding_factory import EmbeddingFactory
        from rag.vectorstores.chroma_store import ChromaVectorStore

        embedder = EmbeddingFactory.get(settings.EMBED_PROVIDER)
        store    = ChromaVectorStore(collection_id)

        total_upserted = 0
        for batch_start in range(0, len(chunks), BATCH_SIZE):
            batch = chunks[batch_start : batch_start + BATCH_SIZE]
            texts = [c["text"] for c in batch]

            logger.info(
                "EMBED  batch  document_id=%s chunks=%d-%d",
                document_id, batch_start, batch_start + len(batch) - 1,
            )
            if on_stage:
                on_stage("generating_embeddings")
            embeddings = _embed_with_retry(embedder, texts)
            if len(embeddings) != len(batch):
                raise RuntimeError(f"Embedding count mismatch: got {len(embeddings)} for {len(batch)} chunks")
            if any(not emb for emb in embeddings):
                raise RuntimeError("Embedding provider returned an empty vector")

            # Attach embeddings and upsert
            for chunk, emb in zip(batch, embeddings):
                chunk["embedding"] = emb

            if on_stage:
                on_stage("vectorizing")
            store.add_chunks_with_embeddings(batch)
            total_upserted += len(batch)
            logger.info(
                "UPSERT done   document_id=%s upserted=%d/%d",
                document_id, total_upserted, len(chunks),
            )

        logger.info(
            "INGEST complete document_id=%s pages=%d chunks=%d",
            document_id, page_count, total_upserted,
        )
        return {"chunk_count": total_upserted, "page_count": page_count, "chunks": chunks}
