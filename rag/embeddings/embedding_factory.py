"""
Embedding factory — langchain-ollama (primary), HuggingFace (fallback).
"""
from functools import lru_cache


class EmbeddingFactory:
    @staticmethod
    @lru_cache(maxsize=1)
    def get(provider: str = "ollama"):
        if provider == "ollama":
            from langchain_ollama import OllamaEmbeddings
            from app.core.config import settings
            return OllamaEmbeddings(
                model=settings.OLLAMA_EMBED_MODEL,
                base_url=settings.OLLAMA_BASE_URL,
            )
        if provider == "huggingface":
            from langchain_community.embeddings import HuggingFaceEmbeddings
            from app.core.config import settings
            return HuggingFaceEmbeddings(model_name=settings.HUGGINGFACE_MODEL)
        raise ValueError(f"Unknown embedding provider: {provider}")
