"""
Chat service - orchestrates RAG, persists conversations, supports streaming.
"""
import json
import logging
import uuid
from typing import AsyncGenerator

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatMessage, ChatSession
from app.models.collection import Collection
from app.schemas.chat import ChatRequest

logger = logging.getLogger("rag.chat")


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ensure_collection(self, collection_id: uuid.UUID, user_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(Collection).where(Collection.id == collection_id, Collection.owner_id == user_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Collection not found")

    async def _get_or_create_session(self, payload: ChatRequest, user_id: uuid.UUID) -> ChatSession:
        await self._ensure_collection(payload.collection_id, user_id)

        if payload.session_id:
            result = await self.db.execute(
                select(ChatSession)
                .options(selectinload(ChatSession.messages))
                .where(ChatSession.id == payload.session_id, ChatSession.user_id == user_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            return session

        session = ChatSession(
            user_id=user_id,
            collection_id=payload.collection_id,
            title=payload.message[:80] if payload.message else None,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        logger.info("Chat session created session_id=%s user_id=%s", session.id, user_id)
        return session

    async def chat(self, payload: ChatRequest, user_id: uuid.UUID) -> dict:
        from rag.pipelines.rag_pipeline import RAGPipeline

        session = await self._get_or_create_session(payload, user_id)
        prior_history = await self._build_history(session.id)

        user_msg = ChatMessage(session_id=session.id, role="user", content=payload.message)
        self.db.add(user_msg)
        await self.db.flush()

        result = await RAGPipeline().run(
            query=payload.message,
            collection_id=str(payload.collection_id),
            chat_history=prior_history,
        )

        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=result["answer"],
            sources=json.dumps(result.get("sources", [])),
        )
        self.db.add(assistant_msg)
        await self.db.commit()
        await self.db.refresh(user_msg)
        await self.db.refresh(assistant_msg)

        return {
            "session_id": session.id,
            "answer": result["answer"],
            "sources": result.get("sources", []),
            "messages": [
                self._message_to_dict(user_msg),
                self._message_to_dict(assistant_msg),
            ],
        }

    async def stream_response(self, payload: ChatRequest, user_id: uuid.UUID) -> AsyncGenerator[str, None]:
        from rag.pipelines.rag_pipeline import RAGPipeline

        session = await self._get_or_create_session(payload, user_id)
        prior_history = await self._build_history(session.id)
        user_msg = ChatMessage(session_id=session.id, role="user", content=payload.message)
        self.db.add(user_msg)
        await self.db.commit()
        await self.db.refresh(user_msg)

        yield f"data: {json.dumps({'session_id': str(session.id), 'message': self._message_to_dict(user_msg)})}\n\n"

        pipeline = RAGPipeline()
        async def emit_stage(stage: str, label: str, detail: str | None = None) -> str:
            return f"data: {json.dumps({'retrieval_stage': {'stage': stage, 'label': label, 'detail': detail}})}\n\n"

        sources = []
        full_response = ""
        try:
            if pipeline.should_use_retrieval(payload.message):
                yield await emit_stage("searching", "Searching your documents", "Looking for the most useful passages")
                yield await emit_stage("analyzing", "Reading the best matches", "Checking nearby context")
                retrieval = await pipeline.retrieve(payload.message, str(payload.collection_id), prior_history)
                chunks = retrieval["chunks"]
                yield await emit_stage(
                    "ranking",
                    "Choosing sources",
                    f"{len(chunks)} source{'' if len(chunks) == 1 else 's'} selected",
                )
                sources = pipeline.sources_from_chunks(chunks)
                yield f"data: {json.dumps({'retrieval': {'sources': sources, 'metrics': retrieval.get('metrics', {})}})}\n\n"
                yield await emit_stage("generating", "Drafting answer", "Using the selected sources")
                stream = pipeline.stream_from_chunks(payload.message, chunks, prior_history)
            else:
                yield await emit_stage("generating", "Thinking", "Answering directly")
                stream = pipeline.stream_direct(payload.message, prior_history)

            async for chunk in stream:
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk, 'session_id': str(session.id)})}\n\n"
        except Exception as exc:
            logger.exception("Chat stream failed session_id=%s", session.id)
            detail = f"AI response failed: {exc}"
            yield f"data: {json.dumps({'error': detail, 'session_id': str(session.id)})}\n\n"
            yield "data: [DONE]\n\n"
            return

        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=full_response,
            sources=json.dumps(sources),
        )
        self.db.add(assistant_msg)
        from app.schemas.notification import NotificationCreate
        from app.services.notification_service import NotificationService

        await NotificationService(self.db).create(
            user_id,
            NotificationCreate(
                type="chat",
                title="Answer ready",
                message=(full_response[:140] + "...") if len(full_response) > 140 else full_response,
                entity_type="chat_session",
                entity_id=str(session.id),
            ),
            commit=False,
        )
        await self.db.commit()
        await self.db.refresh(assistant_msg)
        yield f"data: {json.dumps({'message': self._message_to_dict(assistant_msg), 'session_id': str(session.id)})}\n\n"
        yield "data: [DONE]\n\n"

    async def _build_history(self, session_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(10)
        )
        messages = list(reversed(result.scalars().all()))
        if not messages:
            return []
        return [{"role": m.role, "content": m.content} for m in messages[-10:]]

    def _message_to_dict(self, message: ChatMessage) -> dict:
        return {
            "id": str(message.id),
            "role": message.role,
            "content": message.content,
            "sources": json.loads(message.sources or "[]"),
            "created_at": message.created_at.isoformat(),
        }

    async def list_sessions(self, user_id: uuid.UUID) -> list[ChatSession]:
        result = await self.db.execute(
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
        )
        return result.scalars().all()

    async def get_session(self, session_id: uuid.UUID, user_id: uuid.UUID) -> ChatSession:
        result = await self.db.execute(
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    async def delete_session(self, session_id: uuid.UUID, user_id: uuid.UUID) -> None:
        session = await self.get_session(session_id, user_id)
        await self.db.delete(session)
        await self.db.commit()

    async def rename_session(self, session_id: uuid.UUID, user_id: uuid.UUID, title: str) -> ChatSession:
        session = await self.get_session(session_id, user_id)
        session.title = title.strip()[:500]
        await self.db.commit()
        await self.db.refresh(session)
        return session
