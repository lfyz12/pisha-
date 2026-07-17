"""API tests for the knowledge-base admin endpoints — external services mocked."""

import shutil
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from ai_assistant.models import GrantCategory, KBDocument
from ai_assistant.tasks import ingest_kb_document
from security.models import SecurityAuditLog
from users.models import MfaDevice, User

KB_DOCUMENTS_URL = "/api/ai/kb/documents/"
KB_CATEGORIES_URL = "/api/ai/kb/categories/"


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


class KBApiBaseTestCase(TempMediaRootMixin, TestCase):
    """Admin (with confirmed MFA, as FullyAuthenticated requires) and student."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username="kb-admin", password="secret", role=User.Role.ADMIN
        )
        MfaDevice.objects.create(
            user=self.admin, secret_encrypted="secret", confirmed_at=timezone.now()
        )
        self.student_user = User.objects.create_user(
            username="kb-student", password="secret", role=User.Role.STUDENT
        )
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)
        self.student_client = APIClient()
        self.student_client.force_authenticate(self.student_user)

    def _md_file(self, name="doc.md"):
        return SimpleUploadedFile(
            name, b"# Grant\nText about grants.", content_type="text/markdown"
        )

    def _url_document(self, **kwargs):
        defaults = {
            "title": "URL doc",
            "source_type": KBDocument.SourceType.URL,
            "source_url": "https://example.com/grants/2026",
            "created_by": self.admin,
        }
        defaults.update(kwargs)
        return KBDocument.objects.create(**defaults)


class KBDocumentCreateTests(KBApiBaseTestCase):
    def test_admin_creates_document_with_file(self):
        with patch.object(ingest_kb_document, "delay") as mock_delay:
            response = self.admin_client.post(
                KB_DOCUMENTS_URL,
                {"file": self._md_file(), "title": "Grant Doc"},
                format="multipart",
                secure=True,
            )
        self.assertEqual(response.status_code, 201)
        document = KBDocument.objects.get()
        self.assertEqual(document.title, "Grant Doc")
        self.assertEqual(document.source_type, KBDocument.SourceType.FILE)
        self.assertEqual(document.status, KBDocument.Status.PENDING)
        self.assertEqual(document.created_by, self.admin)
        self.assertEqual(response.data["data"]["title"], "Grant Doc")
        self.assertEqual(response.data["status"], 201)
        mock_delay.assert_called_once_with(str(document.id))

    def test_admin_creates_document_with_url_and_default_title(self):
        with patch.object(ingest_kb_document, "delay") as mock_delay:
            response = self.admin_client.post(
                KB_DOCUMENTS_URL,
                {"source_url": "https://example.com/grants/2026"},
                format="multipart",
                secure=True,
            )
        self.assertEqual(response.status_code, 201)
        document = KBDocument.objects.get()
        self.assertEqual(document.source_type, KBDocument.SourceType.URL)
        self.assertEqual(document.title, "example.com/grants/2026")
        mock_delay.assert_called_once_with(str(document.id))

    def test_create_with_both_file_and_url_is_rejected(self):
        with patch.object(ingest_kb_document, "delay") as mock_delay:
            response = self.admin_client.post(
                KB_DOCUMENTS_URL,
                {
                    "file": self._md_file(),
                    "source_url": "https://example.com/grants/2026",
                },
                format="multipart",
                secure=True,
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(KBDocument.objects.count(), 0)
        mock_delay.assert_not_called()

    def test_create_with_neither_file_nor_url_is_rejected(self):
        with patch.object(ingest_kb_document, "delay") as mock_delay:
            response = self.admin_client.post(
                KB_DOCUMENTS_URL, {"title": "Nothing"}, format="multipart", secure=True
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(KBDocument.objects.count(), 0)
        mock_delay.assert_not_called()

    def test_create_rejects_unsupported_extension(self):
        with patch.object(ingest_kb_document, "delay") as mock_delay:
            response = self.admin_client.post(
                KB_DOCUMENTS_URL,
                {"file": SimpleUploadedFile("evil.exe", b"MZ-binary")},
                format="multipart",
                secure=True,
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(KBDocument.objects.count(), 0)
        mock_delay.assert_not_called()

    def test_student_cannot_create_document(self):
        response = self.student_client.post(
            KB_DOCUMENTS_URL,
            {"file": self._md_file()},
            format="multipart",
            secure=True,
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("message", response.data)
        self.assertEqual(KBDocument.objects.count(), 0)

    def test_student_cannot_list_documents(self):
        response = self.student_client.get(KB_DOCUMENTS_URL, secure=True)
        self.assertEqual(response.status_code, 403)


class KBDocumentListTests(KBApiBaseTestCase):
    def test_document_list_is_paginated(self):
        for index in range(3):
            self._url_document(title=f"Doc {index}")
        response = self.admin_client.get(KB_DOCUMENTS_URL, secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 3)
        self.assertEqual(len(response.data["data"]), 3)
        self.assertEqual(response.data["page"], 1)
        first = response.data["data"][0]
        self.assertIn("status", first)
        self.assertIn("categories", first)
        self.assertIn("chunk_count", first)


class KBDocumentDetailTests(KBApiBaseTestCase):
    def test_admin_updates_title_and_categories(self):
        document = self._url_document(title="Old title")
        response = self.admin_client.patch(
            f"{KB_DOCUMENTS_URL}{document.id}/",
            {"title": "New title", "categories": ["science-grants"]},
            format="json",
            secure=True,
        )
        self.assertEqual(response.status_code, 200)
        document.refresh_from_db()
        self.assertEqual(document.title, "New title")
        self.assertEqual(
            list(document.categories.values_list("slug", flat=True)),
            ["science-grants"],
        )
        self.assertEqual(
            response.data["data"]["categories"],
            [{"slug": "science-grants", "name": "Научные гранты"}],
        )
        self.assertTrue(
            SecurityAuditLog.objects.filter(
                event="kb_document.updated", target=str(document.id)
            ).exists()
        )

    def test_admin_deletes_document_and_chunks(self):
        document = self._url_document()
        with patch("ai_assistant.views.delete_doc_chunks") as mock_delete:
            response = self.admin_client.delete(
                f"{KB_DOCUMENTS_URL}{document.id}/", secure=True
            )
        self.assertEqual(response.status_code, 204)
        mock_delete.assert_called_once_with("kb_chunk", str(document.id))
        self.assertFalse(KBDocument.objects.filter(pk=document.id).exists())
        self.assertTrue(
            SecurityAuditLog.objects.filter(
                event="kb_document.deleted", target=str(document.id)
            ).exists()
        )

    def test_delete_succeeds_when_surrealdb_is_unavailable(self):
        document = self._url_document()
        with patch(
            "ai_assistant.views.delete_doc_chunks",
            side_effect=ConnectionError("surreal down"),
        ):
            response = self.admin_client.delete(
                f"{KB_DOCUMENTS_URL}{document.id}/", secure=True
            )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(KBDocument.objects.filter(pk=document.id).exists())


class KBDocumentReingestTests(KBApiBaseTestCase):
    def test_reingest_ready_document_enqueues_task(self):
        document = self._url_document(status=KBDocument.Status.READY, error="old")
        with patch.object(ingest_kb_document, "delay") as mock_delay:
            response = self.admin_client.post(
                f"{KB_DOCUMENTS_URL}{document.id}/reingest/", secure=True
            )
        self.assertEqual(response.status_code, 202)
        mock_delay.assert_called_once_with(str(document.id))
        document.refresh_from_db()
        self.assertEqual(document.status, KBDocument.Status.PENDING)
        self.assertEqual(document.error, "")
        self.assertTrue(
            SecurityAuditLog.objects.filter(
                event="kb_document.reingested", target=str(document.id)
            ).exists()
        )

    def test_reingest_processing_document_conflicts(self):
        document = self._url_document(status=KBDocument.Status.PROCESSING)
        with patch.object(ingest_kb_document, "delay") as mock_delay:
            response = self.admin_client.post(
                f"{KB_DOCUMENTS_URL}{document.id}/reingest/", secure=True
            )
        self.assertEqual(response.status_code, 409)
        self.assertIn("message", response.data)
        mock_delay.assert_not_called()
        document.refresh_from_db()
        self.assertEqual(document.status, KBDocument.Status.PROCESSING)


class KBCategoryTests(KBApiBaseTestCase):
    def test_student_can_list_categories(self):
        response = self.student_client.get(KB_CATEGORIES_URL, secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 7)  # seeded categories

    def test_student_cannot_create_category(self):
        response = self.student_client.post(
            KB_CATEGORIES_URL,
            {"name": "Nope", "slug": "nope"},
            format="json",
            secure=True,
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(GrantCategory.objects.filter(slug="nope").exists())

    def test_admin_category_crud_and_duplicate_slug(self):
        response = self.admin_client.post(
            KB_CATEGORIES_URL,
            {"name": "Test Category", "slug": "test-category", "description": "d"},
            format="json",
            secure=True,
        )
        self.assertEqual(response.status_code, 201)
        category = GrantCategory.objects.get(slug="test-category")
        self.assertTrue(
            SecurityAuditLog.objects.filter(
                event="kb_category.created", target=str(category.id)
            ).exists()
        )

        duplicate = self.admin_client.post(
            KB_CATEGORIES_URL,
            {"name": "Duplicate", "slug": "test-category"},
            format="json",
            secure=True,
        )
        self.assertEqual(duplicate.status_code, 400)

        updated = self.admin_client.patch(
            f"{KB_CATEGORIES_URL}{category.id}/",
            {"name": "Renamed", "is_active": False},
            format="json",
            secure=True,
        )
        self.assertEqual(updated.status_code, 200)
        category.refresh_from_db()
        self.assertEqual(category.name, "Renamed")
        self.assertFalse(category.is_active)
        self.assertTrue(
            SecurityAuditLog.objects.filter(
                event="kb_category.updated", target=str(category.id)
            ).exists()
        )

        deleted = self.admin_client.delete(
            f"{KB_CATEGORIES_URL}{category.id}/", secure=True
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(GrantCategory.objects.filter(pk=category.pk).exists())
        self.assertTrue(
            SecurityAuditLog.objects.filter(
                event="kb_category.deleted", target=str(category.id)
            ).exists()
        )
