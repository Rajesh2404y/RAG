"""
Semantic search route — query vector store for relevant chunks.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat import SearchRequest, SearchResult
from app.services.search_service import SearchService

router = APIRouter()


@router.post("/", response_model=list[SearchResult])
async def semantic_search(
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await SearchService(db).search(payload, current_user.id)
