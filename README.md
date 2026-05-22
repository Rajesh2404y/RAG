# Local RAG Chatbot

Simple local Retrieval-Augmented Generation chatbot for PDF question answering.

No OpenAI, Gemini, Claude, or paid cloud AI APIs are required. The app runs with Ollama, SentenceTransformers, ChromaDB, FastAPI, React, Vite, Tailwind, and Axios.

## Features

- Upload PDFs and save them locally
- Extract text with `pypdf`
- Split text into overlapping chunks
- Create local embeddings with `sentence-transformers/all-MiniLM-L6-v2`
- Store vectors locally in ChromaDB
- Ask questions from uploaded documents
- Stream answers from a local Ollama model
- Keep simple chat history
- Show retrieved sources and upload status

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite + Tailwind CSS + Axios |
| Backend | FastAPI + Python + SQLAlchemy |
| LLM | Ollama local model, default `llama3` |
| Embeddings | Ollama `nomic-embed-text` by default, optional SentenceTransformers |
| Vector DB | Local persistent ChromaDB |
| Storage | Local `storage/` and `vectordb/` folders |

## Quick Start

### 1. Install Ollama

Install Ollama from https://ollama.com, then pull a local model:

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

Keep Ollama running on `http://localhost:11434`.

### 2. Configure

```bash
cp .env.example .env
```

Recommended local settings:

```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3
EMBED_PROVIDER=ollama
OLLAMA_EMBED_MODEL=nomic-embed-text
DATABASE_URL=sqlite+aiosqlite:///./rag_dev.db
USE_CELERY=false
```

### 3. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## RAG Pipeline

```text
PDF Upload
-> Text Extraction
-> Chunking
-> Local Embeddings
-> ChromaDB
-> User Question
-> Similarity Search
-> Ollama Answer
```

## Health Checks

- `GET /health/ready`
- `GET /health/upload`
- `GET /health/vector`
- `GET /health/embedding`
- `GET /health/ai`
- `GET /health/chat`

## Project Structure

```text
frontend/      React UI
backend/       FastAPI app
rag/           RAG loaders, chunking, embeddings, vector store, retrieval, prompts
storage/       Uploaded PDFs
vectordb/      ChromaDB persistence
logs/          Backend logs
```

## Notes

- First SentenceTransformers load can take time while the model initializes.
- First Ollama answer can take time while the model loads into memory.
- Use smaller Ollama models such as `phi3` or `gemma` on low-memory machines.
