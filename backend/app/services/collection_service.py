"""
Collection service — workspace CRUD.
"""
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.collection import Collection
from app.schemas.collection import CollectionCreate, CollectionUpdate


class CollectionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, payload: CollectionCreate, owner_id: uuid.UUID) -> Collection:
        col = Collection(**payload.model_dump(), owner_id=owner_id)
        self.db.add(col)
        await self.db.commit()
        await self.db.refresh(col)
        return col

    async def list_by_owner(self, owner_id: uuid.UUID) -> list[Collection]:
        result = await self.db.execute(select(Collection).where(Collection.owner_id == owner_id))
        return result.scalars().all()

    async def update(self, collection_id: uuid.UUID, payload: CollectionUpdate, owner_id: uuid.UUID) -> Collection:
        col = await self._get_owned(collection_id, owner_id)
        for k, v in payload.model_dump(exclude_none=True).items():
            setattr(col, k, v)
        await self.db.commit()
        await self.db.refresh(col)
        return col

    async def delete(self, collection_id: uuid.UUID, owner_id: uuid.UUID) -> None:
        col = await self._get_owned(collection_id, owner_id)
        await self.db.delete(col)
        await self.db.commit()

    async def _get_owned(self, collection_id: uuid.UUID, owner_id: uuid.UUID) -> Collection:
        result = await self.db.execute(
            select(Collection).where(Collection.id == collection_id, Collection.owner_id == owner_id)
        )
        col = result.scalar_one_or_none()
        if not col:
            raise HTTPException(status_code=404, detail="Collection not found")
        return col
