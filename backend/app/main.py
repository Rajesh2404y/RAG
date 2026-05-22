"""
FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from pathlib import Path
import logging
import sys
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.api.routes import auth, users, documents, collections, chat, search, health, notifications
from app.core.config import BASE_DIR, settings
from app.core.logging import setup_logging
from app.db.session import init_db
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware

setup_logging("DEBUG" if settings.APP_DEBUG else "INFO")
logger = logging.getLogger("rag.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    for configured_path in (settings.UPLOAD_DIR, settings.TEMP_DIR, settings.PROCESSED_DIR, settings.CHROMA_PERSIST_DIR):
        path = Path(configured_path)
        if not path.is_absolute():
            path = BASE_DIR / path
        path.mkdir(parents=True, exist_ok=True)
        logger.info("Validated persistent path %s", path)
    await init_db()
    yield


async def _request_body(request: Request) -> str:
    try:
        body = await request.body()
    except Exception:
        return "<unavailable>"
    if not body:
        return ""
    text = body[:4096].decode("utf-8", errors="replace")
    return text if len(body) <= 4096 else f"{text}...<truncated>"


def _error_payload(request_id: str, detail: str) -> dict:
    payload = {"detail": detail, "request_id": request_id}
    if settings.APP_DEBUG:
        payload["debug"] = True
    return payload


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        debug=settings.APP_DEBUG,
        lifespan=lifespan,
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning(
            "HTTPException request_id=%s method=%s path=%s status=%s detail=%s",
            getattr(request.state, "request_id", "-"),
            request.method,
            request.url.path,
            exc.status_code,
            exc.detail,
        )
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.warning(
            "ValidationError request_id=%s method=%s path=%s body=%s errors=%s",
            request_id,
            request.method,
            request.url.path,
            await _request_body(request),
            exc.errors(),
        )
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "request_id": request_id},
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.exception(
            "DatabaseError request_id=%s method=%s path=%s body=%s",
            request_id,
            request.method,
            request.url.path,
            await _request_body(request),
        )
        return JSONResponse(
            status_code=500,
            content=_error_payload(request_id, f"Database error: {exc.__class__.__name__}"),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.exception(
            "UnhandledError request_id=%s method=%s path=%s body=%s",
            request_id,
            request.method,
            request.url.path,
            await _request_body(request),
        )
        return JSONResponse(
            status_code=500,
            content=_error_payload(request_id, f"Internal server error: {exc.__class__.__name__}"),
        )

    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, tags=["health"])
    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
    app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
    app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
    app.include_router(collections.router, prefix="/api/v1/collections", tags=["collections"])
    app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
    app.include_router(search.router, prefix="/api/v1/search", tags=["search"])

    return app


app = create_application()
