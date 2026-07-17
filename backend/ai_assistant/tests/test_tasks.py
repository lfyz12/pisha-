"""Tests for ai_assistant.tasks — external services are mocked."""

import shutil
import tempfile
import uuid
from types import SimpleNamespace
from unittest.mock import Mock, patch

import httpx
from celery.exceptions import Retry
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from ai_assistant.models import KBDocument, StudentProject
from ai_assistant.services.parsing import DocumentParsingError
from ai_assistant.tasks import (
    _run_ingest,
    ingest_kb_document,
    process_student_project,
)
from students.models import Student


class TempMediaRootMixin:
    """Give each class its own MEDIA_ROOT, created and removed with the class."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media_root = tempfile.mkdtemp(prefix="ai_assistant_test_media_")
        cls._media_override = override_settings(MEDIA_ROOT=cls._media_root)
        cls._media_override.enable()
        cls.addClassCleanup(cls._media_override.disable)
        cls.addClassCleanup(shutil.rmtree, cls._media_root, ignore_errors=True)


def _embeddings_mock(get_embeddings):
    """Configure the embeddings mock to return one 2-d vector per chunk."""
    get_embeddings.return_value.embed_documents.side_effect = (
        lambda chunks: [[0.1, 0.2]] * len(chunks)
    )
    return get_embeddings.return_value


@patch("ai_assistant.tasks.upsert_chunks")
@patch("ai_assistant.tasks.get_embeddings")
@patch("ai_assistant.tasks.classify_and_summarize")
class IngestTaskTests(TempMediaRootMixin, TestCase):
    # The seeded migration provides the active slug "science-grants".

    def _make_kb_doc(self, name="doc.md", content="# Гранты\n\nТекст о грантах.".encode()):
        return KBDocument.objects.create(
            title="KB doc",
            source_type=KBDocument.SourceType.FILE,
            file=SimpleUploadedFile(name, content),
        )

    def _make_project(self, content="# Проект\n\nОписание проекта.".encode()):
        student = Student.objects.create(
            name="Иванов Иван",
            initials="ИИ",
            student_id=f"S-{uuid.uuid4().hex[:8]}",
            course=2,
            group_name="ИВТ-101",
        )
        return StudentProject.objects.create(
            student=student,
            title="Проект",
            file=SimpleUploadedFile("project.md", content),
        )

    def test_ingest_kb_document_happy_path(self, classify, get_embeddings, upsert):
        doc = self._make_kb_doc()
        classify.return_value = {"summary": "Саммари.", "categories": ["science-grants"]}
        _embeddings_mock(get_embeddings)

        ingest_kb_document.run(str(doc.id))

        doc.refresh_from_db()
        self.assertEqual(doc.status, KBDocument.Status.READY)
        self.assertEqual(doc.error, "")
        self.assertEqual(doc.summary, "Саммари.")
        self.assertGreater(doc.chunk_count, 0)
        self.assertEqual(
            [category.slug for category in doc.categories.all()], ["science-grants"]
        )

        upsert.assert_called_once()
        table, doc_id, meta, chunks, vectors = upsert.call_args.args
        self.assertEqual(table, "kb_chunk")
        self.assertEqual(doc_id, str(doc.id))
        self.assertEqual(
            meta,
            {
                "title": "KB doc",
                "categories": ["science-grants"],
                "source_url": None,
                "doc_kind": "kb",
            },
        )
        self.assertEqual(len(chunks), doc.chunk_count)
        self.assertEqual(len(vectors), len(chunks))

    def test_ingest_kb_document_from_url(self, classify, get_embeddings, upsert):
        doc = KBDocument.objects.create(
            title="URL doc",
            source_type=KBDocument.SourceType.URL,
            source_url="https://example.com/grants",
        )
        classify.return_value = {"summary": "Саммари.", "categories": []}
        _embeddings_mock(get_embeddings)

        with patch(
            "ai_assistant.tasks.fetch_url_text", return_value="Текст со страницы."
        ) as fetch:
            ingest_kb_document.run(str(doc.id))

        fetch.assert_called_once_with("https://example.com/grants")
        doc.refresh_from_db()
        self.assertEqual(doc.status, KBDocument.Status.READY)
        self.assertEqual(upsert.call_args.args[2]["source_url"], "https://example.com/grants")

    def test_process_student_project_happy_path(self, classify, get_embeddings, upsert):
        project = self._make_project()
        classify.return_value = {
            "summary": "Саммари проекта.",
            "categories": ["science-grants"],
        }
        _embeddings_mock(get_embeddings)

        process_student_project.run(str(project.id))

        project.refresh_from_db()
        self.assertEqual(project.status, StudentProject.Status.READY)
        self.assertEqual(project.summary, "Саммари проекта.")

        upsert.assert_called_once()
        table, doc_id, meta, _chunks, _vectors = upsert.call_args.args
        self.assertEqual(table, "project_chunk")
        self.assertEqual(doc_id, str(project.id))
        self.assertEqual(meta["doc_kind"], "project")
        self.assertEqual(meta["student_id"], str(project.student_id))
        self.assertEqual(meta["categories"], ["science-grants"])
        self.assertNotIn("source_url", meta)

    def test_parsing_error_marks_failed_without_retry(
        self, classify, get_embeddings, upsert
    ):
        doc = self._make_kb_doc()

        with patch(
            "ai_assistant.tasks.extract_text",
            side_effect=DocumentParsingError("corrupt file"),
        ):
            ingest_kb_document.run(str(doc.id))  # must not raise or retry

        doc.refresh_from_db()
        self.assertEqual(doc.status, KBDocument.Status.FAILED)
        self.assertIn("corrupt file", doc.error)
        upsert.assert_not_called()

    def test_empty_text_is_an_ingest_error(self, classify, get_embeddings, upsert):
        doc = self._make_kb_doc(content=b"   ")
        classify.return_value = {"summary": "", "categories": []}

        ingest_kb_document.run(str(doc.id))

        doc.refresh_from_db()
        self.assertEqual(doc.status, KBDocument.Status.FAILED)
        self.assertIn("no extractable text", doc.error)
        upsert.assert_not_called()

    def test_transient_error_triggers_retry(self, classify, get_embeddings, upsert):
        doc = self._make_kb_doc()
        classify.return_value = {"summary": "Саммари.", "categories": []}
        get_embeddings.return_value.embed_documents.side_effect = httpx.ConnectError(
            "gateway down"
        )
        task_self = SimpleNamespace(
            request=SimpleNamespace(retries=0),
            retry=Mock(side_effect=Retry("retry later")),
        )

        with self.assertRaises(Retry):
            _run_ingest(task_self, doc, table="kb_chunk", build_meta=Mock())

        task_self.retry.assert_called_once()
        self.assertEqual(task_self.retry.call_args.kwargs["countdown"], 30)
        doc.refresh_from_db()
        self.assertEqual(doc.status, KBDocument.Status.PROCESSING)
        upsert.assert_not_called()

    def test_transient_error_fails_after_retries_exhausted(
        self, classify, get_embeddings, upsert
    ):
        doc = self._make_kb_doc()
        classify.return_value = {"summary": "Саммари.", "categories": []}
        get_embeddings.return_value.embed_documents.side_effect = httpx.ConnectError(
            "gateway down"
        )
        task_self = SimpleNamespace(
            request=SimpleNamespace(retries=2),
            retry=Mock(side_effect=Retry("retry later")),
        )

        _run_ingest(task_self, doc, table="kb_chunk", build_meta=Mock())

        task_self.retry.assert_not_called()
        doc.refresh_from_db()
        self.assertEqual(doc.status, KBDocument.Status.FAILED)
        self.assertIn("gateway down", doc.error)

    def test_missing_kb_document_is_noop(self, *_mocks):
        ingest_kb_document.run(str(uuid.uuid4()))  # must not raise

    def test_missing_student_project_is_noop(self, *_mocks):
        process_student_project.run(str(uuid.uuid4()))  # must not raise
