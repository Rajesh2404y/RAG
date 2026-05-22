"""
SQLAlchemy async engine, session factory, and base model.
"""
import logging
import ssl

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger("rag.db")


def _build_engine_options(database_url: str) -> tuple[str, dict]:
    url = make_url(database_url)
    engine_options: dict = {"echo": settings.APP_DEBUG}

    if url.drivername in {"postgresql", "postgres"}:
        url = url.set(drivername="postgresql+asyncpg")

    if url.drivername == "postgresql+asyncpg":
        query = dict(url.query)
        ssl_mode = query.pop("sslmode", None) or query.pop("ssl", None)
        url = url.set(query=query)

        connect_args = {"statement_cache_size": 0}
        if ssl_mode in {"require", "prefer", "verify-ca", "verify-full"} or "supabase" in (url.host or ""):
            connect_args["ssl"] = ssl.create_default_context()

        engine_options.update(poolclass=NullPool, connect_args=connect_args)
    elif url.drivername.startswith("sqlite"):
        engine_options["connect_args"] = {"check_same_thread": False}

    return url.render_as_string(hide_password=False), engine_options


DATABASE_URL, ENGINE_OPTIONS = _build_engine_options(settings.DATABASE_URL)

engine = create_async_engine(DATABASE_URL, **ENGINE_OPTIONS)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    logger.info("Running init_db - creating tables if not exist")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if conn.dialect.name == "sqlite":
            columns = await conn.execute(text("PRAGMA table_info(users)"))
            existing = {row[1] for row in columns}
            if "avatar_url" not in existing:
                await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(1000)"))
            if "job_title" not in existing:
                await conn.execute(text("ALTER TABLE users ADD COLUMN job_title VARCHAR(255)"))
            columns = await conn.execute(text("PRAGMA table_info(documents)"))
            existing = {row[1] for row in columns}
            if "processing_stage" not in existing:
                await conn.execute(text("ALTER TABLE documents ADD COLUMN processing_stage VARCHAR(80)"))
        elif conn.dialect.name == "postgresql":
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1000)"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255)"))
            await conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_stage VARCHAR(80)"))
    logger.info("init_db complete")


async def check_db() -> dict:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"ok": True}
    except SQLAlchemyError as exc:
        logger.exception("Database health check failed")
        return {"ok": False, "error": exc.__class__.__name__, "detail": str(exc)}


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            logger.exception("Database session rolled back")
            raise
