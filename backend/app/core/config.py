"""
Central configuration — reads from .env file.
"""
from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BASE_DIR.parent


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "Local RAG Chatbot"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    APP_DEBUG: bool = True

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database — SQLite for local dev, swap to PostgreSQL async URL for prod
    DATABASE_URL: str = "sqlite+aiosqlite:///./rag_dev.db"

    # Redis (Celery broker — optional for local dev)
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_CELERY: bool = False

    # Storage
    UPLOAD_DIR: str = "storage/uploads/pdfs"
    TEMP_DIR: str = "storage/uploads/temp"
    PROCESSED_DIR: str = "storage/processed"
    MAX_UPLOAD_SIZE_MB: int = 50

    # Vector DB
    CHROMA_PERSIST_DIR: str = "vectordb/chroma"
    CHROMA_COLLECTION_PREFIX: str = "rag"

    # ── Ollama (primary LLM + embeddings) ─────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:8b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"   # pull with: ollama pull nomic-embed-text

    LLM_MAX_TOKENS: int = 650

    # ── HuggingFace (optional fallback) ───────────────────────────────────────
    HUGGINGFACE_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # RAG tuning
    CHUNK_SIZE: int = 850
    CHUNK_OVERLAP: int = 125
    RETRIEVAL_TOP_K: int = 3
    RETRIEVAL_CANDIDATE_K: int = 12
    RETRIEVAL_MIN_SCORE: float = 0.08
    RETRIEVAL_CONTEXT_TOKEN_BUDGET: int = 1800

    # Active providers
    LLM_PROVIDER: str = "ollama"
    EMBED_PROVIDER: str = "ollama"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # AWS (future)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"

    class Config:
        env_file = BASE_DIR / ".env"
        case_sensitive = True
        extra = "ignore"  # ignore system env vars not in our schema (e.g. DEBUG=release)


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
