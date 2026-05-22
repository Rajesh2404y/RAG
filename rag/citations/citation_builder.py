"""
Citation builder — formats retrieved chunks into structured source citations.
"""
from dataclasses import dataclass


@dataclass
class Citation:
    document_id: str
    filename: str
    page_number: int | None
    excerpt: str
    score: float


class CitationBuilder:
    def build(self, retrieved_chunks: list[dict]) -> list[Citation]:
        seen = set()
        citations = []
        for chunk in retrieved_chunks:
            key = (chunk["document_id"], chunk.get("page_number"))
            if key not in seen:
                seen.add(key)
                citations.append(Citation(
                    document_id=chunk["document_id"],
                    filename=chunk["filename"],
                    page_number=chunk.get("page_number"),
                    excerpt=chunk["content"][:200],
                    score=chunk.get("score", 0.0),
                ))
        return citations

    def to_dict(self, citations: list[Citation]) -> list[dict]:
        return [
            {
                "document_id": c.document_id,
                "filename": c.filename,
                "page_number": c.page_number,
                "excerpt": c.excerpt,
                "score": round(c.score, 4),
            }
            for c in citations
        ]
