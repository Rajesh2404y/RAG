"""
User service — profile management.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi import HTTPException, status

from app.core.hashing import hash_password, verify_password
from app.models.user import User
from app.schemas.user import PasswordChange, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update(self, user_id: uuid.UUID, payload: UserUpdate) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()
        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.job_title is not None:
            user.job_title = payload.job_title
        if payload.avatar_url is not None:
            user.avatar_url = payload.avatar_url
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def change_password(self, user_id: uuid.UUID, payload: PasswordChange) -> None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()
        if not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        user.hashed_password = hash_password(payload.new_password)
        await self.db.commit()
