"""Fetching and text extraction for URL-based knowledge-base documents."""

from __future__ import annotations

import logging
from urllib.parse import urljoin

import httpx
import trafilatura

from ai_assistant.services.parsing import DocumentParsingError

logger = logging.getLogger(__name__)

#: Timeout of a single HTTP request, in seconds.
FETCH_TIMEOUT_SECONDS = 15.0
#: Maximum number of redirects followed before giving up.
MAX_REDIRECTS = 5
#: Hard cap on the downloaded body size; larger pages are truncated.
MAX_BODY_BYTES = 5 * 1024 * 1024


def _download(url: str) -> httpx.Response:
    """GET ``url``, following up to MAX_REDIRECTS redirects manually.

    Redirects are followed one hop at a time (the top-level ``httpx.get``
    cannot cap them itself), so a redirect loop is stopped after
    MAX_REDIRECTS hops instead of the httpx default.

    Raises:
        DocumentParsingError: if the redirect limit is exceeded.
        httpx.HTTPError: on network/transport failures (propagated as-is so
            the calling Celery task can retry them).
    """
    current_url = url
    for _ in range(MAX_REDIRECTS + 1):
        response = httpx.get(
            current_url, timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=False
        )
        if not response.is_redirect:
            return response
        current_url = urljoin(current_url, response.headers["location"])
    raise DocumentParsingError(
        f"too many redirects (>{MAX_REDIRECTS}) while fetching {url}"
    )


def fetch_url_text(url: str) -> str:
    """Download ``url`` and extract its main text content with trafilatura.

    The page is fetched with a FETCH_TIMEOUT_SECONDS timeout and at most
    MAX_REDIRECTS redirects; bodies larger than MAX_BODY_BYTES are truncated
    before extraction.

    Raises:
        DocumentParsingError: on HTTP 4xx/5xx responses, redirect loops, or
            when no text can be extracted from the page.
        httpx.HTTPError: on network/transport failures (propagated as-is so
            the calling Celery task can retry them).
    """
    response = _download(url)
    if response.status_code >= 400:
        raise DocumentParsingError(
            f"failed to fetch {url}: HTTP {response.status_code}"
        )
    body = response.content
    if len(body) > MAX_BODY_BYTES:
        logger.info(
            "Truncating body of %s from %d to %d bytes",
            url, len(body), MAX_BODY_BYTES,
        )
        body = body[:MAX_BODY_BYTES]
    text = trafilatura.extract(body)
    if not text or not text.strip():
        raise DocumentParsingError(f"no text could be extracted from {url}")
    return text.strip()
