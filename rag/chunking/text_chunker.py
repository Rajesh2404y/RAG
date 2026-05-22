"""
Section-aware document chunking for RAG ingestion.

The splitter keeps chunks in the 700-1000 character range by default, preserves
page metadata, tracks section headings, and adds stable neighboring context
metadata for hierarchical retrieval.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ModuleNotFoundError:
    RecursiveCharacterTextSplitter = None

from app.core.config import settings
from rag.loaders.pdf_loader import PageContent


HEADING_RE = re.compile(
    r"^\s*((?:\d+(?:\.\d+)*[\).]?\s+)?[A-Z][A-Za-z0-9 ,:/&()\-]{3,90})\s*$"
)


@dataclass(frozen=True)
class SectionBlock:
    title: str | None
    text: str


class DocumentChunker:
    def __init__(self, chunk_size: int | None = None, chunk_overlap: int | None = None):
        chunk_size = chunk_size or settings.CHUNK_SIZE
        chunk_overlap = chunk_overlap if chunk_overlap is not None else settings.CHUNK_OVERLAP
        self.splitter = (
            RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""],
                keep_separator=True,
            )
            if RecursiveCharacterTextSplitter
            else _FallbackRecursiveSplitter(chunk_size, chunk_overlap)
        )

    def chunk(self, pages: list[PageContent]) -> list[dict]:
        chunks: list[dict] = []
        global_index = 0

        for page in pages:
            page_blocks = self._section_blocks(page.text)
            page_chunk_start = len(chunks)

            for block in page_blocks:
                for local_index, text in enumerate(self.splitter.split_text(block.text)):
                    cleaned = self._clean(text)
                    if not cleaned:
                        continue

                    chunks.append({
                        "text": cleaned,
                        "metadata": {
                            "document_id": page.document_id,
                            "filename": page.filename,
                            "page_number": page.page_number,
                            "chunk_index": global_index,
                            "page_chunk_index": local_index,
                            "section_title": block.title or "",
                            "char_count": len(cleaned),
                            "token_estimate": max(1, len(cleaned) // 4),
                        },
                    })
                    global_index += 1

            page_chunk_end = len(chunks)
            for idx in range(page_chunk_start, page_chunk_end):
                chunks[idx]["metadata"]["prev_chunk_index"] = chunks[idx - 1]["metadata"]["chunk_index"] if idx > 0 else -1
                chunks[idx]["metadata"]["next_chunk_index"] = chunks[idx + 1]["metadata"]["chunk_index"] if idx + 1 < len(chunks) else -1

        return chunks

    def _section_blocks(self, text: str) -> list[SectionBlock]:
        lines = [line.strip() for line in text.splitlines()]
        blocks: list[SectionBlock] = []
        current_title: str | None = None
        current: list[str] = []

        for line in lines:
            if not line:
                if current:
                    current.append("")
                continue

            if self._looks_like_heading(line):
                if current:
                    blocks.append(SectionBlock(current_title, "\n".join(current).strip()))
                    current = []
                current_title = line
                current.append(line)
            else:
                current.append(line)

        if current:
            blocks.append(SectionBlock(current_title, "\n".join(current).strip()))

        return [block for block in blocks if block.text] or [SectionBlock(None, text)]

    def _looks_like_heading(self, line: str) -> bool:
        if len(line) > 96 or line.endswith("."):
            return False
        if HEADING_RE.match(line):
            words = line.split()
            return len(words) <= 12
        return False

    def _clean(self, text: str) -> str:
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


class _FallbackRecursiveSplitter:
    def __init__(self, chunk_size: int, chunk_overlap: int):
        self.chunk_size = chunk_size
        self.chunk_overlap = min(chunk_overlap, chunk_size // 3)
        self.separators = ["\n\n", "\n", ". ", "; ", ", ", " "]

    def split_text(self, text: str) -> list[str]:
        parts = self._split_recursive(text, self.separators)
        chunks: list[str] = []
        current = ""
        for part in parts:
            if len(current) + len(part) <= self.chunk_size:
                current = f"{current}{part}"
                continue
            if current.strip():
                chunks.append(current.strip())
            overlap = current[-self.chunk_overlap :] if self.chunk_overlap else ""
            current = f"{overlap}{part}"
        if current.strip():
            chunks.append(current.strip())
        return chunks

    def _split_recursive(self, text: str, separators: list[str]) -> list[str]:
        if len(text) <= self.chunk_size or not separators:
            return [text]
        separator = separators[0]
        parts = text.split(separator)
        output: list[str] = []
        for index, part in enumerate(parts):
            if not part:
                continue
            piece = part + (separator if index < len(parts) - 1 else "")
            if len(piece) > self.chunk_size:
                output.extend(self._split_recursive(piece, separators[1:]))
            else:
                output.append(piece)
        return output
