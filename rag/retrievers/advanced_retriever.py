"""Advanced hybrid retrieval orchestration for the RAG pipeline."""
from __future__ import annotations

import asyncio
import math
import re
import time
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from typing import Iterable

from app.core.config import settings
from rag.retrievers.metrics import retrieval_metrics
from rag.vectorstores.chroma_store import ChromaVectorStore


TOKEN_RE = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9_\-]{1,}")
STOPWORDS = {
    "about", "after", "again", "also", "and", "are", "because", "been", "can", "could", "does",
    "from", "have", "into", "that", "the", "their", "there", "this", "what", "when", "where",
    "which", "with", "would", "your", "you",
}


@dataclass(frozen=True)
class RetrievalOptions:
    top_k: int = settings.RETRIEVAL_TOP_K
    candidate_k: int = settings.RETRIEVAL_CANDIDATE_K
    min_score: float = settings.RETRIEVAL_MIN_SCORE
    token_budget: int = settings.RETRIEVAL_CONTEXT_TOKEN_BUDGET
    document_id: str | None = None
    page_number: int | None = None


class QueryUnderstandingService:
    def rewrite(self, query: str, chat_history: list[dict] | None = None) -> str:
        query = " ".join(query.split())
        if not chat_history:
            return query
        recent_user_turns = [m["content"] for m in chat_history[-4:] if m.get("role") == "user"]
        if not recent_user_turns:
            return query
        if len(query.split()) <= 8 or any(token in query.lower() for token in {"it", "they", "this", "that", "above"}):
            return f"{recent_user_turns[-1]} {query}"
        return query

    def expand(self, query: str) -> list[str]:
        tokens = [token for token in _tokens(query) if token not in STOPWORDS]
        keyword_query = " ".join(tokens[:10])
        variants = [query]
        if keyword_query and keyword_query.lower() != query.lower():
            variants.append(keyword_query)
        if len(tokens) >= 7:
            variants.append(" ".join(tokens[:5]))
        return _unique(variants)[:3]

    def hyde(self, query: str) -> str:
        return f"Relevant document passage answering: {query}"


class HybridRetriever:
    def __init__(self, collection_id: str):
        self.collection_id = collection_id
        self.store = ChromaVectorStore(collection_id)
        self.query_service = QueryUnderstandingService()

    async def retrieve(
        self,
        query: str,
        chat_history: list[dict] | None = None,
        options: RetrievalOptions | None = None,
    ) -> dict:
        started = time.perf_counter()
        timings: dict[str, float] = {}
        options = options or RetrievalOptions()
        rewritten = self.query_service.rewrite(query, chat_history)
        queries = self.query_service.expand(rewritten)
        filters = self._filters(options)
        vector_where = self._chroma_where(filters)

        vector_started = time.perf_counter()
        vector_tasks = [
            asyncio.to_thread(self.store.query, q, max(options.candidate_k // len(queries), options.top_k), vector_where)
            for q in queries
        ]
        if len(_tokens(rewritten)) >= 7:
            hyde_query = self.query_service.hyde(rewritten)
            vector_tasks.append(asyncio.to_thread(self.store.query, hyde_query, options.top_k, vector_where))
        vector_results_nested = await asyncio.gather(*vector_tasks)
        timings["vector_ms"] = _elapsed_ms(vector_started)

        lexical_started = time.perf_counter()
        lexical_results = await asyncio.to_thread(self._lexical_candidates, rewritten, options.candidate_k, filters)
        timings["lexical_ms"] = _elapsed_ms(lexical_started)

        candidates = self._merge_candidates([item for group in vector_results_nested for item in group], lexical_results)
        ranked = self._rerank(rewritten, candidates)
        diversified = self._mmr(ranked, options.candidate_k)
        compressed = self._compress(diversified, options)

        timings["total_latency_ms"] = _elapsed_ms(started)
        metrics_event = {
            **timings,
            "collection_id": self.collection_id,
            "candidate_count": len(candidates),
            "final_count": len(compressed),
            "query_count": len(vector_tasks),
        }
        retrieval_metrics.record(metrics_event)

        return {
            "query": query,
            "rewritten_query": rewritten,
            "expanded_queries": queries,
            "chunks": compressed,
            "candidate_count": len(candidates),
            "metrics": metrics_event,
        }

    def _filters(self, options: RetrievalOptions) -> dict:
        filters = {}
        if options.document_id:
            filters["document_id"] = options.document_id
        if options.page_number is not None:
            filters["page_number"] = options.page_number
        return filters

    def _chroma_where(self, filters: dict) -> dict | None:
        if not filters:
            return None
        if len(filters) == 1:
            return filters
        return {"$and": [{key: value} for key, value in filters.items()]}

    def _lexical_candidates(self, query: str, top_k: int, filters: dict) -> list[dict]:
        chunks = _cached_chunks(self.collection_id)
        if filters:
            chunks = [
                chunk for chunk in chunks
                if all(chunk["metadata"].get(key) == value for key, value in filters.items())
            ]
        if not chunks:
            return []

        query_terms = _tokens(query)
        document_frequency = Counter()
        tokenized_chunks = []
        for chunk in chunks:
            terms = _tokens(chunk["content"])
            tokenized_chunks.append((chunk, terms))
            document_frequency.update(set(terms))

        avgdl = sum(len(terms) for _, terms in tokenized_chunks) / max(1, len(tokenized_chunks))
        scored = []
        for chunk, terms in tokenized_chunks:
            score = _bm25(query_terms, terms, document_frequency, len(tokenized_chunks), avgdl)
            if score <= 0:
                continue
            meta = chunk["metadata"]
            scored.append({
                "chunk_id": chunk["id"],
                "content": chunk["content"],
                "document_id": str(meta.get("document_id", "")),
                "filename": meta.get("filename", ""),
                "page_number": meta.get("page_number"),
                "section_title": meta.get("section_title", ""),
                "score": min(1.0, score / 12),
                "lexical_score": score,
                "vector_score": 0.0,
            })

        scored.sort(key=lambda item: item["lexical_score"], reverse=True)
        return scored[:top_k]

    def _merge_candidates(self, vector_results: list[dict], lexical_results: list[dict]) -> list[dict]:
        merged: dict[str, dict] = {}
        for result in vector_results:
            meta = result.get("metadata", {})
            chunk_id = _chunk_id(result)
            merged[chunk_id] = {
                "chunk_id": chunk_id,
                "content": result["content"],
                "document_id": str(meta.get("document_id", "")),
                "filename": meta.get("filename", ""),
                "page_number": meta.get("page_number"),
                "section_title": meta.get("section_title", ""),
                "score": float(result.get("score", 0)),
                "vector_score": float(result.get("score", 0)),
                "lexical_score": 0.0,
            }

        for result in lexical_results:
            existing = merged.get(result["chunk_id"])
            if existing:
                existing["lexical_score"] = max(existing.get("lexical_score", 0.0), result["lexical_score"])
                existing["score"] = max(existing["score"], result["score"])
            else:
                merged[result["chunk_id"]] = result

        return list(merged.values())

    def _rerank(self, query: str, candidates: list[dict]) -> list[dict]:
        query_terms = set(_tokens(query))
        ranked = []
        for candidate in candidates:
            content_terms = _tokens(candidate["content"])
            overlap = len(query_terms & set(content_terms)) / max(1, len(query_terms))
            section_boost = 0.04 if candidate.get("section_title") and query_terms & set(_tokens(candidate["section_title"])) else 0
            score = (
                0.58 * float(candidate.get("vector_score", 0.0)) +
                0.24 * min(1.0, float(candidate.get("lexical_score", 0.0)) / 12) +
                0.18 * overlap +
                section_boost
            )
            enriched = {**candidate, "score": round(score, 4), "relevance_score": round(score, 4)}
            if enriched["score"] >= settings.RETRIEVAL_MIN_SCORE:
                ranked.append(enriched)

        ranked.sort(key=lambda item: item["score"], reverse=True)
        return ranked

    def _mmr(self, candidates: list[dict], limit: int, lambda_mult: float = 0.74) -> list[dict]:
        selected: list[dict] = []
        remaining = candidates[:]
        while remaining and len(selected) < limit:
            if not selected:
                selected.append(remaining.pop(0))
                continue
            best_index = 0
            best_score = -math.inf
            for index, candidate in enumerate(remaining):
                similarity = max(_jaccard(candidate["content"], picked["content"]) for picked in selected)
                mmr_score = lambda_mult * candidate["score"] - (1 - lambda_mult) * similarity
                if mmr_score > best_score:
                    best_index = index
                    best_score = mmr_score
            selected.append(remaining.pop(best_index))
        return selected

    def _compress(self, candidates: list[dict], options: RetrievalOptions) -> list[dict]:
        chunks = []
        used_tokens = 0
        seen_fingerprints: set[str] = set()

        for candidate in candidates:
            fingerprint = _fingerprint(candidate["content"])
            if fingerprint in seen_fingerprints:
                continue
            token_estimate = max(1, len(candidate["content"]) // 4)
            if chunks and used_tokens + token_estimate > options.token_budget:
                continue
            chunks.append({**candidate, "token_estimate": token_estimate})
            used_tokens += token_estimate
            seen_fingerprints.add(fingerprint)
            if len(chunks) >= options.top_k:
                break

        return chunks


@lru_cache(maxsize=128)
def _cached_chunks(collection_id: str) -> tuple[dict, ...]:
    store = ChromaVectorStore(collection_id)
    return tuple(store.get_all_chunks())


def invalidate_collection_cache(collection_id: str) -> None:
    _cached_chunks.cache_clear()


def _tokens(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text) if token.lower() not in STOPWORDS]


def _bm25(query_terms: list[str], doc_terms: list[str], df: Counter, doc_count: int, avgdl: float) -> float:
    if not query_terms or not doc_terms:
        return 0.0
    tf = Counter(doc_terms)
    score = 0.0
    k1 = 1.5
    b = 0.75
    dl = len(doc_terms)
    for term in query_terms:
        if term not in tf:
            continue
        idf = math.log(1 + (doc_count - df[term] + 0.5) / (df[term] + 0.5))
        denom = tf[term] + k1 * (1 - b + b * dl / max(avgdl, 1))
        score += idf * (tf[term] * (k1 + 1)) / denom
    return score


def _chunk_id(result: dict) -> str:
    meta = result.get("metadata", {})
    return result.get("id") or f"{meta.get('document_id')}_{meta.get('page_number')}_{meta.get('chunk_index', 0)}"


def _unique(values: Iterable[str]) -> list[str]:
    seen = set()
    output = []
    for value in values:
        key = value.lower()
        if key not in seen:
            output.append(value)
            seen.add(key)
    return output


def _fingerprint(text: str) -> str:
    tokens = _tokens(text)[:80]
    return " ".join(tokens)


def _jaccard(a: str, b: str) -> float:
    a_terms = set(_tokens(a))
    b_terms = set(_tokens(b))
    if not a_terms or not b_terms:
        return 0.0
    return len(a_terms & b_terms) / len(a_terms | b_terms)


def _elapsed_ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)
