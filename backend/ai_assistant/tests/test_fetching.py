"""Tests for ai_assistant.services.fetching — HTTP and extraction are mocked."""

from unittest.mock import Mock, patch

import httpx
from django.test import SimpleTestCase

from ai_assistant.services import fetching
from ai_assistant.services.parsing import DocumentParsingError


def _response(status_code=200, content=b"<html><body>text</body></html>", headers=None):
    response = Mock(spec=httpx.Response)
    response.status_code = status_code
    response.content = content
    response.headers = httpx.Headers(headers or {})
    response.is_redirect = status_code in (301, 302, 303, 307, 308) and bool(
        headers and headers.get("location")
    )
    return response


@patch("ai_assistant.services.fetching.trafilatura.extract")
@patch("ai_assistant.services.fetching.httpx.get")
class FetchUrlTextTests(SimpleTestCase):
    def test_success_returns_extracted_text(self, get, extract):
        get.return_value = _response()
        extract.return_value = "Содержимое страницы."

        result = fetching.fetch_url_text("https://example.com/grants")

        self.assertEqual(result, "Содержимое страницы.")
        get.assert_called_once_with(
            "https://example.com/grants",
            timeout=fetching.FETCH_TIMEOUT_SECONDS,
            follow_redirects=False,
        )
        extract.assert_called_once_with(b"<html><body>text</body></html>")

    def test_extract_none_raises_parsing_error(self, get, extract):
        get.return_value = _response()
        extract.return_value = None

        with self.assertRaisesRegex(DocumentParsingError, "no text"):
            fetching.fetch_url_text("https://example.com")

    def test_extract_whitespace_only_raises_parsing_error(self, get, extract):
        get.return_value = _response()
        extract.return_value = "   "

        with self.assertRaisesRegex(DocumentParsingError, "no text"):
            fetching.fetch_url_text("https://example.com")

    def test_http_error_status_raises_parsing_error(self, get, extract):
        get.return_value = _response(status_code=404)

        with self.assertRaisesRegex(DocumentParsingError, "404"):
            fetching.fetch_url_text("https://example.com/missing")

        extract.assert_not_called()

    def test_transport_error_propagates_as_is(self, get, _extract):
        get.side_effect = httpx.ConnectError("connection refused")

        with self.assertRaises(httpx.TransportError):
            fetching.fetch_url_text("https://example.com")

    def test_redirects_are_followed(self, get, extract):
        get.side_effect = [
            _response(
                status_code=302, headers={"location": "/grants/"}, content=b""
            ),
            _response(status_code=200),
        ]
        extract.return_value = "Текст."

        result = fetching.fetch_url_text("https://example.com/grants")

        self.assertEqual(result, "Текст.")
        self.assertEqual(get.call_count, 2)
        self.assertEqual(get.call_args.args[0], "https://example.com/grants/")

    def test_too_many_redirects_raise_parsing_error(self, get, _extract):
        get.return_value = _response(
            status_code=302, headers={"location": "/loop"}, content=b""
        )

        with self.assertRaisesRegex(DocumentParsingError, "too many redirects"):
            fetching.fetch_url_text("https://example.com/start")

        self.assertEqual(get.call_count, fetching.MAX_REDIRECTS + 1)

    def test_oversized_body_is_truncated(self, get, extract):
        get.return_value = _response(content=b"x" * (fetching.MAX_BODY_BYTES + 10))
        extract.return_value = "ok"

        fetching.fetch_url_text("https://example.com")

        self.assertEqual(len(extract.call_args.args[0]), fetching.MAX_BODY_BYTES)
