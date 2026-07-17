"""Tests for ai_assistant.services.llm — everything external is mocked."""

from unittest.mock import Mock, patch

import httpx
from django.conf import settings
from django.test import SimpleTestCase, override_settings

from ai_assistant.services import llm


def _response(status_code=200, payload=None, text=""):
    response = Mock(spec=httpx.Response)
    response.status_code = status_code
    response.text = text
    response.json.return_value = payload if payload is not None else {}
    return response


@override_settings(
    LITELLM_BASE_URL="http://litellm.test:4000",
    LITELLM_API_KEY="sk-test",
)
class ClientFactoryTests(SimpleTestCase):
    @patch("ai_assistant.services.llm.ChatOpenAI")
    def test_get_chat_llm_uses_chat_model_and_streams(self, chat_cls):
        llm.get_chat_llm()
        chat_cls.assert_called_once_with(
            base_url=settings.LITELLM_BASE_URL,
            api_key=settings.LITELLM_API_KEY,
            model=settings.LITELLM_CHAT_MODEL,
            streaming=True,
        )

    @patch("ai_assistant.services.llm.ChatOpenAI")
    def test_get_classifier_llm_uses_classifier_model_without_streaming(
        self, chat_cls
    ):
        llm.get_classifier_llm()
        chat_cls.assert_called_once_with(
            base_url=settings.LITELLM_BASE_URL,
            api_key=settings.LITELLM_API_KEY,
            model=settings.LITELLM_CLASSIFIER_MODEL,
            streaming=False,
        )

    @patch("ai_assistant.services.llm.OpenAIEmbeddings")
    def test_get_embeddings_uses_embedding_model(self, embeddings_cls):
        llm.get_embeddings()
        embeddings_cls.assert_called_once_with(
            base_url=settings.LITELLM_BASE_URL,
            api_key=settings.LITELLM_API_KEY,
            model=settings.LITELLM_EMBEDDING_MODEL,
        )

    def test_factories_raise_runtime_error_when_config_is_empty(self):
        with override_settings(LITELLM_API_KEY=""):
            for factory in (llm.get_chat_llm, llm.get_classifier_llm, llm.get_embeddings):
                with self.assertRaisesRegex(RuntimeError, "LITELLM_API_KEY"):
                    factory()


@override_settings(
    LITELLM_BASE_URL="http://litellm.test:4000",
    LITELLM_API_KEY="sk-test",
    LITELLM_RERANK_MODEL="rerank-model",
)
class RerankTests(SimpleTestCase):
    def test_missing_base_url_raises_runtime_error(self):
        with override_settings(LITELLM_BASE_URL=""):
            with self.assertRaisesRegex(RuntimeError, "LITELLM_BASE_URL"):
                llm.rerank("q", ["d1"])

    def test_missing_api_key_raises_runtime_error(self):
        with override_settings(LITELLM_API_KEY=""):
            with self.assertRaisesRegex(RuntimeError, "LITELLM_API_KEY"):
                llm.rerank("q", ["d1"])

    @patch("ai_assistant.services.llm.time.sleep")
    @patch("ai_assistant.services.llm.httpx.post")
    def test_rerank_posts_cohere_body_and_sorts_by_score(self, post, _sleep):
        post.return_value = _response(
            payload={
                "results": [
                    {"index": 1, "relevance_score": 0.2},
                    {"index": 0, "relevance_score": 0.9},
                    {"index": 2, "relevance_score": 0.5},
                ]
            }
        )

        result = llm.rerank("query", ["d0", "d1", "d2"], top_n=2)

        self.assertEqual(result, [(0, 0.9), (2, 0.5), (1, 0.2)])
        post.assert_called_once_with(
            "http://litellm.test:4000/rerank",
            json={
                "model": "rerank-model",
                "query": "query",
                "documents": ["d0", "d1", "d2"],
                "top_n": 2,
            },
            headers={"Authorization": "Bearer sk-test"},
            timeout=llm.RERANK_TIMEOUT_SECONDS,
        )

    @patch("ai_assistant.services.llm.time.sleep")
    @patch("ai_assistant.services.llm.httpx.post")
    def test_rerank_omits_top_n_when_not_given(self, post, _sleep):
        post.return_value = _response(payload={"results": []})
        llm.rerank("q", ["d"])
        self.assertNotIn("top_n", post.call_args.kwargs["json"])

    @patch("ai_assistant.services.llm.time.sleep")
    @patch("ai_assistant.services.llm.httpx.post")
    def test_rerank_retries_on_5xx_then_succeeds(self, post, sleep):
        post.side_effect = [
            _response(status_code=500, text="boom"),
            _response(status_code=502, text="boom"),
            _response(payload={"results": [{"index": 0, "relevance_score": 1.0}]}),
        ]

        result = llm.rerank("q", ["d"])

        self.assertEqual(result, [(0, 1.0)])
        self.assertEqual(post.call_count, 3)
        self.assertEqual(sleep.call_count, 2)

    @patch("ai_assistant.services.llm.time.sleep")
    @patch("ai_assistant.services.llm.httpx.post")
    def test_rerank_gives_up_after_retries_on_5xx(self, post, sleep):
        post.return_value = _response(status_code=500, text="boom")

        with self.assertRaisesRegex(RuntimeError, "HTTP 500"):
            llm.rerank("q", ["d"])

        self.assertEqual(post.call_count, llm.RERANK_MAX_RETRIES + 1)
        self.assertEqual(sleep.call_count, llm.RERANK_MAX_RETRIES)

    @patch("ai_assistant.services.llm.time.sleep")
    @patch("ai_assistant.services.llm.httpx.post")
    def test_rerank_retries_on_network_error_then_gives_up(self, post, sleep):
        post.side_effect = httpx.ConnectError("connection refused")

        with self.assertRaisesRegex(RuntimeError, "connection refused"):
            llm.rerank("q", ["d"])

        self.assertEqual(post.call_count, llm.RERANK_MAX_RETRIES + 1)
        self.assertEqual(sleep.call_count, llm.RERANK_MAX_RETRIES)

    @patch("ai_assistant.services.llm.time.sleep")
    @patch("ai_assistant.services.llm.httpx.post")
    def test_rerank_does_not_retry_on_4xx(self, post, sleep):
        response = _response(status_code=400, text="bad request")
        response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "bad request", request=Mock(), response=response
        )
        post.return_value = response

        with self.assertRaises(httpx.HTTPStatusError):
            llm.rerank("q", ["d"])

        post.assert_called_once()
        sleep.assert_not_called()
