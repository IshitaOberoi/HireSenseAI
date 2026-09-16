from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "hiresense-tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Discover tasks from the pipelines folder
celery_app.autodiscover_tasks(["app.pipelines"])
