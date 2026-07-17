"""Fetching and text extraction for URL-based knowledge-base documents."""

from __future__ import annotations

import logging

import httpx
import trafilatura

from ai_assistant.services.parsing import DocumentParsingError

logger = logging.getLogger(__name__)

#: Timeout of the HTTP request, in seconds.
FETCH_TIMEOUT_SECONDS = 15.0
#: Maximum number of redirects followed before giving up.
MAX_REDIRECTS = 5
#: Hard cap on the downloaded body size; larger pages are truncated.
MAX_BODY_BYTES = 5 * 1024 * 1024
#: User-Agent sent with every request (some sites block the httpx default).
USER_AGENT = "pisha-kb-ingest/1.0 (+https://github.com/pisha-)"


def _safe_url(url: str) -> str:
    """Return ``url`` without userinfo, for use in error messages and logs."""
    try:
        return str(httpx.URL(url).copy_with(username=None, password=None))
    except Exception:  # noqa: BLE001 - sanitizing must never break error paths
        return url


def _download(url: str) -> bytes:
    """GET ``url`` and return the body, capped at MAX_BODY_BYTES.

    Redirects are followed by the httpx client (at most MAX_REDIRECTS hops;
    exceeding the limit raises TooManyRedirects, converted here to a
    DocumentParsingError). The body is streamed chunk by chunk into a
    bytearray, so memory stays bounded by MAX_BODY_BYTES plus one chunk
    regardless of the page size; larger pages are truncated.

    Raises:
        DocumentParsingError: on redirect loops, HTTP 4xx/5xx responses, or
            a final 3xx response the client could not follow (e.g. a redirect
            without a Location header).
        httpx.HTTPError: on network/transport failures (propagated as-is so
            the calling Celery task can retry them).
    """
    body = bytearray()
    truncated = False
    with httpx.Client(
        timeout=FETCH_TIMEOUT_SECONDS,
        follow_redirects=True,
        max_redirects=MAX_REDIRECTS,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        try:
            with client.stream("GET", url) as response:
                if response.status_code >= 400:
                    raise DocumentParsingError(
                        f"failed to fetch {_safe_url(url)}: "
                        f"HTTP {response.status_code}"
                    )
                if response.is_redirect:
                    # With follow_redirects=True a 3xx only reaches us when it
                    # cannot be followed (no Location header to resolve).
                    raise DocumentParsingError(
                        f"failed to fetch {_safe_url(url)}: unresolvable "
                        f"redirect (HTTP {response.status_code})"
                    )
                for chunk in response.iter_bytes():
                    room = MAX_BODY_BYTES - len(body)
                    if room <= 0:
                        truncated = True
                        break
                    if len(chunk) > room:
                        body.extend(chunk[:room])
                        truncated = True
                        break
                    body.extend(chunk)
        except httpx.TooManyRedirects as exc:
            raise DocumentParsingError(
                f"too many redirects (>{MAX_REDIRECTS}) "
                f"while fetching {_safe_url(url)}"
            ) from exc
    if truncated:
        logger.info("Truncated body of %s to %d bytes", _safe_url(url), MAX_BODY_BYTES)
    return bytes(body)


def fetch_url_text(url: str) -> str:
    """Download ``url`` and extract its main text content with trafilatura.

    The page is fetched with a FETCH_TIMEOUT_SECONDS timeout and at most
    MAX_REDIRECTS redirects; bodies larger than MAX_BODY_BYTES are truncated
    (while streaming, so memory stays bounded) before extraction.

    Raises:
        DocumentParsingError: on redirect problems, HTTP 4xx/5xx responses,
            or when no text can be extracted from the page.
        httpx.HTTPError: on network/transport failures (propagated as-is so
            the calling Celery task can retry them).
    """
    body = _download(url)
    text = trafilatura.extract(body)
    if not text or not text.strip():
        raise DocumentParsingError(
            f"no text could be extracted from {_safe_url(url)}"
        )
    return text.strip()
