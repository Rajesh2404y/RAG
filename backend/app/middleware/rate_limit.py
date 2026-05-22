"""
Simple in-memory rate limiter middleware.
Replace with Redis-backed sliding window for production.
"""
import time
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

RATE_LIMIT = 100   # requests
WINDOW_SEC = 60    # per minute


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._store: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host
        now = time.time()
        window_start = now - WINDOW_SEC
        self._store[ip] = [t for t in self._store[ip] if t > window_start]

        if len(self._store[ip]) >= RATE_LIMIT:
            return Response(content="Rate limit exceeded", status_code=429)

        self._store[ip].append(now)
        return await call_next(request)
