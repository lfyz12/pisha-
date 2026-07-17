"""Tests for ai_assistant.services.fetching — HTTP and extraction are mocked."""

from unittest.mock import Mock, patch

import httpx
from django.test import SimpleTestCase

from ai_assistant.services import fetching
from ai_assistant.services.parsing import DocumentParsingError


def _response(status_code=200, chunks=(b"<html><body>text</body></html>",)):
    response = Mock(spec=httpx.Response)
    response.status_code = status_code
    # httpx semantics: is_redirect is purely about the 3xx status code.
    response.is_redirect = 300 <= status_code < 400
    response.iter_bytes.return_value = iter(chunks)
    return response


@patch("ai_assistant.services.fetching.trafilatura.extract")
@patch("ai_assistant.services.fetching.httpx.Client")
class FetchUrlTextTests(SimpleTestCase):
    def _client(self, client_cls):
        return client_cls.return_value.__enter__.return_value

    def _wire(self, client_cls, response):
        """Make the mocked httpx.Client yield ``response`` from stream()."""
        client = self._client(client_cls)
        client.stream.return_value.__enter__.return_value = response
        return client

    def test_success_returns_extracted_text(self, client_cls, extract):
        self._wire(
            client_cls, _response(chunks=(b"<html><body>", b"text</body></html>"))
        )
        extract.return_value = "Содержимое страницы."

        result = fetching.fetch_url_text("https://example.com/grants")

        self.assertEqual(result, "Содержимое страницы.")
        client_cls.assert_called_once_with(
            timeout=fetching.FETCH_TIMEOUT_SECONDS,
            follow_redirects=True,
            max_redirects=fetching.MAX_REDIRECTS,
            headers={"User-Agent": fetching.USER_AGENT},
        )
        self._client(client_cls).stream.assert_called_once_with(
            "GET", "https://example.com/grants"
        )
        # Body chunks are joined before extraction.
        extract.assert_called_once_with(b"<html><body>text</body></html>")

    def test_extract_none_raises_parsing_error(self, client_cls, extract):
        self._wire(client_cls, _response())
        extract.return_value = None

        with self.assertRaisesRegex(DocumentParsingError, "no text"):
            fetching.fetch_url_text("https://example.com")

    def test_extract_whitespace_only_raises_parsing_error(self, client_cls, extract):
        self._wire(client_cls, _response())
        extract.return_value = "   "

        with self.assertRaisesRegex(DocumentParsingError, "no text"):
            fetching.fetch_url_text("https://example.com")

    def test_http_error_status_raises_parsing_error(self, client_cls, extract):
        self._wire(client_cls, _response(status_code=404))

        with self.assertRaisesRegex(DocumentParsingError, "404"):
            fetching.fetch_url_text("https://example.com/missing")

        extract.assert_not_called()

    def test_redirect_without_location_raises_parsing_error(self, client_cls, extract):
        # A final 3xx the client could not follow (no Location header).
        self._wire(client_cls, _response(status_code=302, chunks=(b"",)))

        with self.assertRaisesRegex(DocumentParsingError, "redirect"):
            fetching.fetch_url_text("https://example.com/moved")

        extract.assert_not_called()

    def test_too_many_redirects_raises_parsing_error(self, client_cls, _extract):
        self._client(client_cls).stream.side_effect = httpx.TooManyRedirects(
            "too many redirects", request=Mock()
        )

        with self.assertRaisesRegex(DocumentParsingError, "too many redirects"):
            fetching.fetch_url_text("https://example.com/loop")

    def test_transport_error_propagates_as_is(self, client_cls, _extract):
        self._client(client_cls).stream.side_effect = httpx.ConnectError(
            "connection refused"
        )

        with self.assertRaises(httpx.TransportError):
            fetching.fetch_url_text("https://example.com")

    def test_oversized_body_is_truncated(self, client_cls, extract):
        self._wire(
            client_cls,
            _response(chunks=(b"x" * fetching.MAX_BODY_BYTES, b"tail")),
        )
        extract.return_value = "ok"

        fetching.fetch_url_text("https://example.com")

        self.assertEqual(len(extract.call_args.args[0]), fetching.MAX_BODY_BYTES)

    def test_url_userinfo_is_stripped_from_error_messages(self, client_cls, extract):
        self._wire(client_cls, _response())
        extract.return_value = None

        with self.assertRaises(DocumentParsingError) as ctx:
            fetching.fetch_url_text("https://user:secret@example.com/page")

        self.assertNotIn("secret", str(ctx.exception))
        self.assertIn("https://example.com/page", str(ctx.exception))
