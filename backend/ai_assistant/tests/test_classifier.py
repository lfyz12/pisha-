"""Tests for ai_assistant.services.classifier — the LLM is mocked."""

import json
from unittest.mock import patch

from django.test import TestCase

from ai_assistant.models import GrantCategory
from ai_assistant.services.classifier import (
    MAX_CLASSIFY_TEXT_CHARS,
    MAX_SUMMARY_CHARS,
    ClassificationError,
    classify_and_summarize,
)


def _mock_llm(factory_mock, payload: str):
    """Make the mocked classifier LLM return ``payload`` as message content."""
    llm = factory_mock.return_value
    llm.bind.return_value.invoke.return_value.content = payload
    return llm


@patch("ai_assistant.services.classifier.get_classifier_llm")
class ClassifyAndSummarizeTests(TestCase):
    # The seeded migration provides active slugs "science-grants",
    # "academic-scholarships", ...; an inactive one is added per test class.
    @classmethod
    def setUpTestData(cls):
        GrantCategory.objects.create(
            slug="archived", name="Архивная", is_active=False
        )

    def test_valid_json_returns_summary_and_categories(self, factory):
        llm = _mock_llm(
            factory,
            json.dumps(
                {
                    "summary": "Документ о научных грантах.",
                    "categories": ["science-grants", "academic-scholarships"],
                }
            ),
        )

        result = classify_and_summarize("текст документа")

        self.assertEqual(
            result,
            {
                "summary": "Документ о научных грантах.",
                "categories": ["science-grants", "academic-scholarships"],
            },
        )
        llm.bind.assert_called_once_with(response_format={"type": "json_object"})

    def test_unknown_inactive_and_non_string_slugs_are_dropped(self, factory):
        _mock_llm(
            factory,
            json.dumps(
                {
                    "summary": "Саммари.",
                    "categories": ["science-grants", "no-such-slug", "archived", 42],
                }
            ),
        )

        result = classify_and_summarize("текст")

        self.assertEqual(result["categories"], ["science-grants"])

    def test_summary_is_truncated_to_max_length(self, factory):
        _mock_llm(factory, json.dumps({"summary": "я" * 600, "categories": []}))

        result = classify_and_summarize("текст")

        self.assertEqual(len(result["summary"]), MAX_SUMMARY_CHARS)

    def test_non_list_categories_degrade_to_empty_list(self, factory):
        _mock_llm(
            factory, json.dumps({"summary": "Саммари.", "categories": "science-grants"})
        )

        result = classify_and_summarize("текст")

        self.assertEqual(result, {"summary": "Саммари.", "categories": []})

    def test_invalid_json_raises_classification_error(self, factory):
        _mock_llm(factory, "this is not JSON at all")

        with self.assertRaises(ClassificationError):
            classify_and_summarize("текст")

    def test_non_object_json_raises_classification_error(self, factory):
        _mock_llm(factory, json.dumps(["science-grants"]))

        with self.assertRaises(ClassificationError):
            classify_and_summarize("текст")

    def test_empty_taxonomy_still_summarizes_without_categories(self, factory):
        GrantCategory.objects.all().delete()
        llm = _mock_llm(
            factory, json.dumps({"summary": "Саммари.", "categories": ["science-grants"]})
        )

        result = classify_and_summarize("текст")

        self.assertEqual(result, {"summary": "Саммари.", "categories": []})
        llm.bind.return_value.invoke.assert_called_once()

    def test_text_is_truncated_before_sending(self, factory):
        llm = _mock_llm(factory, json.dumps({"summary": "Саммари.", "categories": []}))

        classify_and_summarize("x" * (MAX_CLASSIFY_TEXT_CHARS + 5000))

        messages = llm.bind.return_value.invoke.call_args.args[0]
        self.assertEqual(len(messages[1]["content"]), MAX_CLASSIFY_TEXT_CHARS)

    def test_system_prompt_lists_active_categories_only(self, factory):
        llm = _mock_llm(factory, json.dumps({"summary": "Саммари.", "categories": []}))

        classify_and_summarize("текст")

        system_prompt = llm.bind.return_value.invoke.call_args.args[0][0]["content"]
        self.assertIn("science-grants", system_prompt)
        self.assertIn("Научные гранты", system_prompt)
        self.assertNotIn("archived", system_prompt)
