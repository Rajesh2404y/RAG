"""
Health routes — liveness, readiness, and component-level checks.
"""
import asyncio
import os

from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import AsyncSessionLocal

router = APIRouter()


@router.get("/health/live")
async def liveness():
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness():
    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        return {"status": "not_ready", "db": str(exc)}
    return {"status": "ready", "db": "ok"} if db_ok else {"status": "not_ready"}


@router.get("/health/vector")
async def vector_health():
    from rag.vectorstores.chroma_store import check_vector_store
    result = check_vector_store()
    return {"status": "ok" if result["ok"] else "error", **result}


@router.get("/health/embedding")
async def embedding_health():
    try:
        from app.core.config import settings
        from rag.embeddings.embedding_factory import EmbeddingFactory
        embedder = EmbeddingFactory.get(settings.EMBED_PROVIDER)
        vec = embedder.embed_query("health check")
        return {"status": "ok", "provider": settings.EMBED_PROVIDER, "dim": len(vec)}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


@router.get("/health/upload")
async def upload_health():
    from pathlib import Path
    from app.core.config import BASE_DIR, settings
    root = Path(settings.UPLOAD_DIR)
    if not root.is_absolute():
        root = BASE_DIR / root
    root.mkdir(parents=True, exist_ok=True)
    writable = root.is_dir() and os.access(root, os.W_OK)
    return {"status": "ok" if writable else "error", "upload_dir": str(root)}


@router.get("/health/ai")
async def ai_health():
    try:
        from app.core.config import settings
        from rag.embeddings.embedding_factory import EmbeddingFactory
        from rag.llm.llm_factory import LLMFactory

        embedder = EmbeddingFactory.get(settings.EMBED_PROVIDER)
        embedding = await asyncio.to_thread(embedder.embed_query, "health check")
        llm = LLMFactory.get("ollama", streaming=False)
        response = await llm.ainvoke("Reply with only: ok")
        return {
            "status": "ok",
            "llm": settings.OLLAMA_MODEL,
            "embedding_model": settings.HUGGINGFACE_MODEL,
            "embedding_dim": len(embedding),
            "sample": getattr(response, "content", str(response))[:80],
        }
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


@router.get("/health/chat")
async def chat_health():
    db = await readiness()
    ai = await ai_health()
    vector = await vector_health()
    ok = db.get("status") == "ready" and ai.get("status") == "ok" and vector.get("status") == "ok"
    return {"status": "ok" if ok else "error", "db": db, "ai": ai, "vector": vector}

