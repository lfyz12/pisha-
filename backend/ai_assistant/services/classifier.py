"""LLM-based classification and summarization of ingested documents."""

from __future__ import annotations

import json
import logging
from typing import Any

from ai_assistant.models import GrantCategory
from ai_assistant.services.llm import get_classifier_llm

logger = logging.getLogger(__name__)

#: Only the first characters of a document are sent to the classifier.
MAX_CLASSIFY_TEXT_CHARS = 12_000
#: Stored summaries are truncated to this length.
MAX_SUMMARY_CHARS = 500

_SYSTEM_PROMPT = (
    "Ты — классификатор базы знаний о грантах, стипендиях и дотациях университета. "
    "По тексту документа составь краткое саммари (1–3 предложения) на русском языке "
    "и выбери подходящие категории СТРОГО из списка ниже (указывай их slug). "
    "Если ни одна категория не подходит, верни пустой список. "
    'Ответь строго одним JSON-объектом вида {"summary": "...", "categories": ["slug", ...]} '
    "без какого-либо другого текста."
)

_SYSTEM_PROMPT_NO_TAXONOMY = (
    "Ты — классификатор базы знаний о грантах, стипендиях и дотациях университета. "
    "По тексту документа составь краткое саммари (1–3 предложения) на русском языке. "
    'Ответь строго одним JSON-объектом вида {"summary": "...", "categories": []} '
    "без какого-либо другого текста."
)


class ClassificationError(RuntimeError):
    """Raised when the classifier LLM returns an unusable (non-JSON) response."""


def _build_system_prompt(categories: list[GrantCategory]) -> str:
    if not categories:
        return _SYSTEM_PROMPT_NO_TAXONOMY
    lines = [_SYSTEM_PROMPT, "", "Доступные категории:"]
    for category in categories:
        line = f"- {category.slug}: {category.name}"
        if category.description:
            line += f" — {category.description}"
        lines.append(line)
    return "\n".join(lines)


def _response_text(content: Any) -> str:
    """Flatten an LLM response ``content`` (str or content blocks) to text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):  # LangChain content blocks
        return "".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return str(content)


def classify_and_summarize(text: str) -> dict:
    """Classify ``text`` into grant categories and summarize it via the LLM.

    Returns ``{"summary": str, "categories": [slug, ...]}``. Only active
    GrantCategory rows are offered to the model; unknown slugs in its answer
    are dropped, the summary is capped at MAX_SUMMARY_CHARS characters, and a
    non-list ``categories`` value degrades to an empty list. When the
    taxonomy is empty, the model is still asked for a summary and the result
    always carries an empty category list.

    Raises:
        ClassificationError: if the LLM response is not a valid JSON object.
        openai.APIError, httpx.HTTPError: transient gateway failures are NOT
            handled here — the calling Celery task retries them.
    """
    categories = list(GrantCategory.objects.filter(is_active=True))
    known_slugs = {category.slug for category in categories}

    messages = [
        {"role": "system", "content": _build_system_prompt(categories)},
        {"role": "user", "content": text[:MAX_CLASSIFY_TEXT_CHARS]},
    ]
    llm = get_classifier_llm().bind(response_format={"type": "json_object"})
    response = llm.invoke(messages)

    raw = _response_text(response.content)
    try:
        payload = json.loads(raw)
    except (TypeError, ValueError) as exc:
        raise ClassificationError(
            f"classifier returned invalid JSON: {raw[:200]!r}"
        ) from exc
    if not isinstance(payload, dict):
        raise ClassificationError(
            f"classifier returned a non-object JSON payload: {raw[:200]!r}"
        )

    summary = payload.get("summary")
    if not isinstance(summary, str):
        summary = ""

    raw_categories = payload.get("categories")
    if not isinstance(raw_categories, list):
        raw_categories = []
    slugs = list(
        dict.fromkeys(
            slug
            for slug in raw_categories
            if isinstance(slug, str) and slug in known_slugs
        )
    )
    return {"summary": summary[:MAX_SUMMARY_CHARS], "categories": slugs}
