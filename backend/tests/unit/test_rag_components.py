"""
Unit tests for RAG components.
"""
import pytest
from rag.chunking.text_chunker import DocumentChunker
from rag.loaders.pdf_loader import PageContent
from rag.citations.citation_builder import CitationBuilder


def test_chunker_splits_text():
    chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
    pages = [PageContent(page_number=1, text="word " * 100, document_id="doc1", filename="test.pdf")]
    chunks = chunker.chunk(pages)
    assert len(chunks) > 1
    assert all("text" in c and "metadata" in c for c in chunks)


def test_citation_builder_deduplicates():
    builder = CitationBuilder()
    chunks = [
        {"document_id": "d1", "filename": "a.pdf", "page_number": 1, "content": "text", "score": 0.9},
        {"document_id": "d1", "filename": "a.pdf", "page_number": 1, "content": "text2", "score": 0.8},
        {"document_id": "d1", "filename": "a.pdf", "page_number": 2, "content": "text3", "score": 0.7},
    ]
    citations = builder.build(chunks)
    assert len(citations) == 2  # page 1 deduplicated
