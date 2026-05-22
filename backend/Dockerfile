FROM python:3.11-slim

WORKDIR /app

# System deps for PyMuPDF + psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc libmupdf-dev && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY rag ./rag

# Create storage dirs
RUN mkdir -p storage/uploads/pdfs storage/uploads/temp storage/processed vectordb/chroma logs/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
