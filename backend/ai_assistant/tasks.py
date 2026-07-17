"""Celery tasks for the AI assistant ingest pipeline.

Both ingest tasks share a single pipeline (``_run_ingest``): extract text
from the uploaded file or the source URL, chunk it, classify/summarize it
with the LLM, embed the chunks, upsert them into SurrealDB and only then
mark the instance as ready in Postgres. Transient external-service errors
are retried with exponential backoff; permanent ones mark the instance as
failed.

Concurrency discipline: at most one ingest task per document may run at a
time. This is NOT enforced here — the API layer is responsible for not
enqueueing a second task while one is pending/running (the pipeline itself
is idempotent, so a duplicate run is wasteful but not corrupting).
"""

from __future__ import annotations

import logging
from typing import Any, Callable

import httpx
from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError
from surrealdb.errors import ConnectionUnavailableError
from websockets.exceptions import ConnectionClosed

from ai_assistant.models import GrantCategory, KBDocument, StudentProject
from ai_assistant.services import surreal
from ai_assistant.services.chunking import chunk_text
from ai_assistant.services.classifier import classify_and_summarize
from ai_assistant.services.fetching import fetch_url_text
from ai_assistant.services.llm import get_embeddings
from ai_assistant.services.parsing import DocumentParsingError, extract_text
from ai_assistant.services.surreal import (
    TABLE_KB_CHUNK,
    TABLE_PROJECT_CHUNK,
    upsert_chunks,
)
from pisha_backend.celery import app

logger = logging.getLogger(__name__)

#: Retries after the initial attempt for transient external-service errors.
#: Single source of truth for both the task decorator and the guard inside
#: _run_ingest — they cannot diverge.
MAX_INGEST_RETRIES = 2
#: First retry delay in seconds; doubled on every subsequent retry.
RETRY_COUNTDOWN_BASE_SECONDS = 30

#: Transient errors of external services that are worth retrying: network
#: failures (httpx), transient LiteLLM/OpenAI gateway responses (connection,
#: timeout, 5xx, rate limit — other APIError subclasses like 4xx are
#: permanent) and SurrealDB connection drops (closed websocket, unavailable
#: connection). Permanent problems (DocumentParsingError, ClassificationError)
#: are not listed and therefore fail immediately.
_RETRYABLE_ERRORS: tuple[type[BaseException], ...] = (
    httpx.HTTPError,
    ConnectionError,
    TimeoutError,
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
    ConnectionClosed,
    ConnectionUnavailableError,
)


def _update_fields(instance: KBDocument | StudentProject, fields: list[str]) -> list[str]:
    """Append ``updated_at`` to ``update_fields`` when the model has one."""
    if hasattr(instance, "updated_at"):
        return [*fields, "updated_at"]
    return fields


def _kb_meta(instance: KBDocument, category_slugs: list[str]) -> dict:
    return {
        "title": instance.title,
        "categories": sorted(category_slugs),
        "source_url": instance.source_url,
        "doc_kind": "kb",
    }


def _project_meta(instance: StudentProject, category_slugs: list[str]) -> dict:
    return {
        "title": instance.title,
        "categories": sorted(category_slugs),
        "student_id": str(instance.student_id),
        "doc_kind": "project",
    }


def _run_ingest(
    task_self: Any,
    instance: KBDocument | StudentProject,
    *,
    table: str,
    build_meta: Callable[[Any, list[str]], dict],
) -> None:
    """Run the shared ingest pipeline for ``instance``.

    Text comes from the uploaded file (or the source URL for KB documents)
    and is chunked first, so an empty document fails cheaply as "no
    extractable text" before any LLM call. The chunks are then classified/
    summarized and embedded, upserted into the SurrealDB ``table`` with the
    metadata produced by ``build_meta``, and only after a successful upsert
    is the instance marked ready in Postgres (summary, categories, chunk
    count) — so a document is never "ready" without its chunks in place.

    Transient external-service errors (see _RETRYABLE_ERRORS) are retried
    via Celery with exponential backoff, up to MAX_INGEST_RETRIES times;
    the shared SurrealDB connection is dropped before each retry so it is
    re-established from scratch. Any other failure marks the instance as
    failed with the error message.
    """
    instance.status = instance.Status.PROCESSING
    instance.error = ""
    instance.save(update_fields=_update_fields(instance, ["status", "error"]))
    try:
        if instance.file:
            text = extract_text(instance.file.path)
        else:  # URL-based KB documents only; projects always have a file.
            text = fetch_url_text(instance.source_url)

        chunks = chunk_text(text)
        if not chunks:
            raise DocumentParsingError("no extractable text")

        result = classify_and_summarize(text)
        category_slugs = result["categories"]
        vectors = get_embeddings().embed_documents(chunks)

        meta = build_meta(instance, category_slugs)
        upsert_chunks(table, str(instance.id), meta, chunks, vectors)

        instance.summary = result["summary"]
        instance.chunk_count = len(chunks)
        instance.status = instance.Status.READY
        instance.save(
            update_fields=_update_fields(instance, ["summary", "chunk_count", "status"])
        )
        instance.categories.set(
            GrantCategory.objects.filter(slug__in=category_slugs)
        )
    except Exception as exc:  # noqa: BLE001 - every failure must reach the failed-path
        retries = getattr(task_self.request, "retries", 0) or 0
        if isinstance(exc, _RETRYABLE_ERRORS) and retries < MAX_INGEST_RETRIES:
            countdown = 2**retries * RETRY_COUNTDOWN_BASE_SECONDS
            logger.warning(
                "Transient ingest error for %s %s (attempt %d/%d): %s; "
                "retrying in %ds",
                type(instance).__name__,
                instance.id,
                retries + 1,
                MAX_INGEST_RETRIES + 1,
                exc,
                countdown,
            )
            # Drop the shared SurrealDB connection so the retry reconnects.
            surreal.close_client()
            raise task_self.retry(exc=exc, countdown=countdown)
        instance.status = instance.Status.FAILED
        instance.error = str(exc)[:2000]
        instance.save(update_fields=_update_fields(instance, ["status", "error"]))
        logger.exception(
            "Ingest of %s %s failed", type(instance).__name__, instance.id
        )


@app.task(bind=True, max_retries=MAX_INGEST_RETRIES, acks_late=True)
def ingest_kb_document(self, doc_id: str) -> None:
    """Ingest a knowledge-base document (file or URL) into the chunk store."""
    try:
        instance = KBDocument.objects.get(id=doc_id)
    except KBDocument.DoesNotExist:
        logger.warning("KBDocument %s no longer exists; skipping ingest", doc_id)
        return
    _run_ingest(self, instance, table=TABLE_KB_CHUNK, build_meta=_kb_meta)


@app.task(bind=True, max_retries=MAX_INGEST_RETRIES, acks_late=True)
def process_student_project(self, project_id: str) -> None:
    """Ingest a student project file into the chunk store."""
    try:
        instance = StudentProject.objects.get(id=project_id)
    except StudentProject.DoesNotExist:
        logger.warning(
            "StudentProject %s no longer exists; skipping ingest", project_id
        )
        return
    _run_ingest(self, instance, table=TABLE_PROJECT_CHUNK, build_meta=_project_meta)
