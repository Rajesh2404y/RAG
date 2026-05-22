"""
PDF loader — uses pypdf for text extraction with page-level metadata.
OCR fallback via pytesseract is stubbed for future activation.
"""
from dataclasses import dataclass
import logging
from pathlib import Path

logger = logging.getLogger("rag.pdf")


@dataclass
class PageContent:
    page_number: int
    text: str
    document_id: str
    filename: str


class PDFLoader:
    def load(self, file_path: str, document_id: str) -> list[PageContent]:
        from pypdf import PdfReader

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {path}")

        pages: list[PageContent] = []

        try:
            reader = PdfReader(str(path))
        except Exception as exc:
            logger.exception("PDF open failed document_id=%s file=%s", document_id, path)
            raise ValueError(f"Unable to open PDF: {exc}") from exc

        for i, page in enumerate(reader.pages):
            page_number = i + 1
            try:
                text = page.extract_text() or ""
            except Exception:
                logger.exception(
                    "PDF page extraction failed document_id=%s file=%s page=%d",
                    document_id,
                    path,
                    page_number,
                )
                text = ""
            text = text.strip()
            if not text:
                logger.warning(
                    "PDF page has no extractable text document_id=%s file=%s page=%d",
                    document_id,
                    path,
                    page_number,
                )
                text = self._ocr_fallback(page_number)
            else:
                logger.info("PDF page parsed document_id=%s page=%d chars=%d", document_id, page_number, len(text))
            pages.append(PageContent(
                page_number=page_number,
                text=text,
                document_id=document_id,
                filename=path.name,
            ))
        return pages

    def _ocr_fallback(self, page_num: int) -> str:
        """
        OCR stub — activate by installing pytesseract + pdf2image + poppler.
        from pdf2image import convert_from_path
        import pytesseract
        images = convert_from_path(file_path, first_page=page_num, last_page=page_num)
        return pytesseract.image_to_string(images[0])
        """
        return ""
