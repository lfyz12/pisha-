"""LLM, embedding and rerank clients routed through the LiteLLM gateway.

All heavy model traffic goes through a single LiteLLM proxy, so the clients
below are thin factories over the OpenAI-compatible API plus one raw HTTP
helper for the Cohere-compatible ``/rerank`` endpoint.
"""

import logging
import time

import httpx
from django.conf import settings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

logger = logging.getLogger(__name__)

RERANK_TIMEOUT_SECONDS = 30.0
# Number of retries after the initial attempt (3 attempts in total).
RERANK_MAX_RETRIES = 2
RERANK_INITIAL_BACKOFF_SECONDS = 0.5


def get_chat_llm() -> ChatOpenAI:
    """Return the main chat model client (streaming) for the consultant."""
    return ChatOpenAI(
        base_url=settings.LITELLM_BASE_URL,
        api_key=settings.LITELLM_API_KEY,
        model=settings.LITELLM_CHAT_MODEL,
        streaming=True,
    )


def get_classifier_llm() -> ChatOpenAI:
    """Return the cheaper non-streaming model used for query classification."""
    return ChatOpenAI(
        base_url=settings.LITELLM_BASE_URL,
        api_key=settings.LITELLM_API_KEY,
        model=settings.LITELLM_CLASSIFIER_MODEL,
        streaming=False,
    )


def get_embeddings() -> OpenAIEmbeddings:
    """Return the embeddings client used for chunks and queries."""
    return OpenAIEmbeddings(
        base_url=settings.LITELLM_BASE_URL,
        api_key=settings.LITELLM_API_KEY,
        model=settings.LITELLM_EMBEDDING_MODEL,
    )


def rerank(
    query: str,
    documents: list[str],
    top_n: int | None = None,
) -> list[tuple[int, float]]:
    """Rerank ``documents`` against ``query`` via the LiteLLM ``/rerank`` endpoint.

    The endpoint is Cohere-compatible: it returns ``{"results": [{"index": i,
    "relevance_score": s}, ...]}``. The result is a list of
    ``(document_index, relevance_score)`` pairs sorted by score, descending.

    Retries up to ``RERANK_MAX_RETRIES`` times with exponential backoff on
    network errors and 5xx responses; 4xx responses fail immediately.

    Raises:
        RuntimeError: if LiteLLM is not configured or all attempts fail.
    """
    base_url = (getattr(settings, "LITELLM_BASE_URL", "") or "").strip()
    api_key = (getattr(settings, "LITELLM_API_KEY", "") or "").strip()
    if not base_url or not api_key:
        raise RuntimeError(
            "LiteLLM rerank is not configured: "
            "LITELLM_BASE_URL and LITELLM_API_KEY must both be non-empty."
        )

    body: dict = {
        "model": settings.LITELLM_RERANK_MODEL,
        "query": query,
        "documents": list(documents),
    }
    if top_n is not None:
        body["top_n"] = top_n
    headers = {"Authorization": f"Bearer {api_key}"}
    url = f"{base_url}/rerank"

    last_error: object = "unknown error"
    for attempt in range(RERANK_MAX_RETRIES + 1):
        try:
            response = httpx.post(
                url, json=body, headers=headers, timeout=RERANK_TIMEOUT_SECONDS
            )
        except httpx.TransportError as exc:
            last_error = exc
        else:
            if response.status_code < 500:
                # 2xx: parse; 4xx: client error, retrying would not help.
                response.raise_for_status()
                results = response.json().get("results", [])
                pairs = [
                    (int(item["index"]), float(item["relevance_score"]))
                    for item in results
                ]
                pairs.sort(key=lambda pair: pair[1], reverse=True)
                return pairs
            last_error = f"HTTP {response.status_code}: {response.text[:200]}"

        if attempt < RERANK_MAX_RETRIES:
            delay = RERANK_INITIAL_BACKOFF_SECONDS * (2**attempt)
            logger.warning(
                "Rerank attempt %d/%d failed (%s); retrying in %.1fs",
                attempt + 1,
                RERANK_MAX_RETRIES + 1,
                last_error,
                delay,
            )
            time.sleep(delay)

    raise RuntimeError(
        f"LiteLLM rerank request failed after "
        f"{RERANK_MAX_RETRIES + 1} attempts: {last_error}"
    )
