import importlib
import shutil
import tempfile

from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from ai_assistant.models import GrantCategory, KBDocument, StudentProject
from students.models import Student

seed_migration = importlib.import_module(
    "ai_assistant.migrations.0002_seed_grant_categories"
)

TEMP_MEDIA_ROOT = tempfile.mkdtemp(prefix="ai_assistant_test_media_")


@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class KBDocumentModelTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)

    def _pdf_file(self, name="doc.pdf"):
        return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")

    def test_clean_accepts_file_only(self):
        doc = KBDocument(
            title="File doc",
            source_type=KBDocument.SourceType.FILE,
            file=self._pdf_file(),
        )
        doc.clean()

    def test_clean_accepts_url_only(self):
        doc = KBDocument(
            title="URL doc",
            source_type=KBDocument.SourceType.URL,
            source_url="https://example.com/grant",
        )
        doc.clean()

    def test_clean_rejects_both_file_and_url(self):
        doc = KBDocument(
            title="Both set",
            source_type=KBDocument.SourceType.FILE,
            file=self._pdf_file(),
            source_url="https://example.com/grant",
        )
        with self.assertRaises(ValidationError):
            doc.clean()

    def test_clean_rejects_neither_file_nor_url(self):
        doc = KBDocument(title="Neither set", source_type=KBDocument.SourceType.FILE)
        with self.assertRaises(ValidationError):
            doc.clean()

    def test_defaults(self):
        doc = KBDocument.objects.create(
            title="URL doc",
            source_type=KBDocument.SourceType.URL,
            source_url="https://example.com/grant",
        )
        self.assertEqual(doc.status, KBDocument.Status.PENDING)
        self.assertEqual(doc.chunk_count, 0)
        self.assertEqual(doc.error, "")
        self.assertEqual(doc.summary, "")
        self.assertIsNone(doc.created_by)


@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class StudentProjectModelTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.student = Student.objects.create(
            name="Test Student",
            initials="TS",
            student_id="ST-0001",
            course=1,
            group_name="G-1",
        )

    def test_file_is_required(self):
        project = StudentProject(student=self.student, title="No file")
        with self.assertRaises(ValidationError):
            project.full_clean()

    def test_create_with_file_and_defaults(self):
        project = StudentProject.objects.create(
            student=self.student,
            title="My project",
            file=SimpleUploadedFile("project.pdf", b"data", content_type="application/pdf"),
        )
        self.assertEqual(project.status, StudentProject.Status.PENDING)
        self.assertEqual(project.chunk_count, 0)
        self.assertIn(project, self.student.projects.all())


class GrantCategorySeedTests(TestCase):
    EXPECTED_SLUGS = {
        "academic-scholarships",
        "social-scholarships",
        "science-grants",
        "startup-grants",
        "contests-olympiads",
        "youth-programs",
        "international-programs",
    }

    def test_seed_creates_exactly_seven_categories(self):
        self.assertEqual(GrantCategory.objects.count(), 7)
        self.assertEqual(
            set(GrantCategory.objects.values_list("slug", flat=True)),
            self.EXPECTED_SLUGS,
        )
        expected_names = dict(seed_migration.GRANT_CATEGORIES)
        for category in GrantCategory.objects.all():
            self.assertEqual(category.name, expected_names[category.slug])
            self.assertTrue(category.is_active)

    def test_seed_is_idempotent(self):
        seed_migration.seed_grant_categories(apps, None)
        seed_migration.seed_grant_categories(apps, None)
        self.assertEqual(GrantCategory.objects.count(), 7)
