"""Local LLM factory backed by Ollama."""
from functools import lru_cache


class LLMFactory:
    @staticmethod
    @lru_cache(maxsize=4)
    def get(provider: str = "ollama", streaming: bool = False):
        if provider != "ollama":
            raise ValueError(f"Unknown local LLM provider: {provider}")

        from app.core.config import settings
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            streaming=streaming,
            temperature=0.2,
            num_predict=settings.LLM_MAX_TOKENS,
        )
