"""
Celery worker configuration.
Broker: Redis | Backend: Redis
Tasks: document ingestion, async processing jobs.
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "rag_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.ingestion_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
