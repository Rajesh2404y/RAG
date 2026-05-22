"""Core RAG pipeline with hybrid retrieval, reranking, context budgeting, and citations."""
from __future__ import annotations

from typing import AsyncGenerator

from langchain_core.output_parsers import StrOutputParser

from app.core.config import settings
from rag.citations.citation_builder import CitationBuilder
from rag.llm.llm_factory import LLMFactory
from rag.memory.chat_memory import ConversationMemoryManager
from rag.prompts.rag_prompts import RAGPrompts
from rag.retrievers.advanced_retriever import HybridRetriever, RetrievalOptions


class RAGPipeline:
    def __init__(self):
        self.llm = LLMFactory.get(settings.LLM_PROVIDER, streaming=False)
        self.streaming_llm = LLMFactory.get(settings.LLM_PROVIDER, streaming=True)
        self.memory = ConversationMemoryManager()
        self.citation_builder = CitationBuilder()
        self.prompt = RAGPrompts.qa_prompt()
        self.direct_prompt = RAGPrompts.direct_prompt()

    def should_use_retrieval(self, query: str) -> bool:
        lowered = query.lower()
        document_terms = {
            "pdf", "document", "file", "uploaded", "source", "citation", "cite",
            "summarize this", "summarise this", "according to", "from the paper",
            "from my", "in this report", "in the document",
        }
        return any(term in lowered for term in document_terms)

    async def retrieve_chunks(self, query: str, collection_id: str, chat_history: list[dict] | None = None) -> list[dict]:
        result = await self.retrieve(query, collection_id, chat_history)
        return result["chunks"]

    async def retrieve(self, query: str, collection_id: str, chat_history: list[dict] | None = None) -> dict:
        retriever = HybridRetriever(collection_id)
        return await retriever.retrieve(
            query,
            chat_history=chat_history or [],
            options=RetrievalOptions(
                top_k=settings.RETRIEVAL_TOP_K,
                candidate_k=settings.RETRIEVAL_CANDIDATE_K,
                token_budget=settings.RETRIEVAL_CONTEXT_TOKEN_BUDGET,
            ),
        )

    def sources_from_chunks(self, chunks: list[dict]) -> list[dict]:
        citations = self.citation_builder.build(chunks)
        source_dicts = self.citation_builder.to_dict(citations)
        by_key = {(source["document_id"], source.get("page_number")): source for source in source_dicts}
        for chunk in chunks:
            key = (chunk.get("document_id"), chunk.get("page_number"))
            source = by_key.get(key)
            if source:
                source["score"] = chunk.get("score", source.get("score", 0))
                source["relevance_score"] = chunk.get("relevance_score", chunk.get("score", 0))
                source["section_title"] = chunk.get("section_title", "")
        return source_dicts

    async def run(self, query: str, collection_id: str, chat_history: list[dict]) -> dict:
        if not self.should_use_retrieval(query):
            answer = await self.answer_direct(query, chat_history, streaming=False)
            return {"answer": answer, "sources": [], "retrieval": {"mode": "direct", "chunks": []}}

        retrieval = await self.retrieve(query, collection_id, chat_history)
        chunks = retrieval["chunks"]
        if not chunks:
            answer = await self.answer_direct(query, chat_history, streaming=False)
            return {"answer": answer, "sources": [], "retrieval": {**retrieval, "mode": "direct_fallback"}}

        context = self._context_from_chunks(chunks)
        history = self.memory.build_history(chat_history)

        chain = self.prompt | self.llm | StrOutputParser()
        answer = await chain.ainvoke({
            "context": context,
            "question": retrieval.get("rewritten_query") or query,
            "chat_history": history,
        })

        return {"answer": answer, "sources": self.sources_from_chunks(chunks), "retrieval": retrieval}

    async def stream(self, query: str, collection_id: str, chat_history: list[dict]) -> AsyncGenerator[str, None]:
        retrieval = await self.retrieve(query, collection_id, chat_history)
        async for chunk in self.stream_from_chunks(query, retrieval["chunks"], chat_history):
            yield chunk

    async def stream_from_chunks(
        self,
        query: str,
        chunks: list[dict],
        chat_history: list[dict],
    ) -> AsyncGenerator[str, None]:
        if not chunks:
            yield "I could not find enough indexed document context for this question. Try uploading a relevant PDF or asking a more specific question."
            return
        context = self._context_from_chunks(chunks)
        history = self.memory.build_history(chat_history)

        chain = self.prompt | self.streaming_llm | StrOutputParser()
        async for chunk in chain.astream({
            "context": context,
            "question": query,
            "chat_history": history,
        }):
            yield chunk

    async def answer_direct(self, query: str, chat_history: list[dict], streaming: bool = False) -> str:
        history = self.memory.build_history(chat_history)
        llm = self.streaming_llm if streaming else self.llm
        chain = self.direct_prompt | llm | StrOutputParser()
        return await chain.ainvoke({"question": query, "chat_history": history})

    async def stream_direct(self, query: str, chat_history: list[dict]) -> AsyncGenerator[str, None]:
        history = self.memory.build_history(chat_history)
        chain = self.direct_prompt | self.streaming_llm | StrOutputParser()
        async for chunk in chain.astream({"question": query, "chat_history": history}):
            yield chunk

    def _context_from_chunks(self, chunks: list[dict]) -> str:
        blocks = []
        for index, chunk in enumerate(chunks, start=1):
            section = f" | section: {chunk['section_title']}" if chunk.get("section_title") else ""
            blocks.append(
                f"[{index}] {chunk['filename']} p.{chunk.get('page_number')}{section} "
                f"| relevance: {chunk.get('score', 0):.2f}\n{chunk['content']}"
            )
        return "\n\n".join(blocks)
