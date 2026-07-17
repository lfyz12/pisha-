"""Tests for ai_assistant.services.validators."""

import io
import zipfile

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings

from ai_assistant.services.validators import validate_upload_file

ALLOWED = [".docx", ".pptx", ".pdf", ".txt", ".md"]


def make_docx_bytes() -> bytes:
    from docx import Document

    buffer = io.BytesIO()
    document = Document()
    document.add_paragraph("Document used as a valid upload fixture.")
    document.save(buffer)
    return buffer.getvalue()


def make_zip_bomb_bytes() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("big.xml", b"0" * (5 * 1024 * 1024))
    return buffer.getvalue()


class ValidateUploadFileTests(SimpleTestCase):
    def test_valid_docx_passes(self):
        uploaded = SimpleUploadedFile("document.docx", make_docx_bytes())
        validate_upload_file(uploaded, ALLOWED)
        # The validator must leave the file readable for further processing.
        self.assertTrue(uploaded.read().startswith(b"PK"))

    def test_extension_check_is_case_insensitive(self):
        uploaded = SimpleUploadedFile("DOCUMENT.DOCX", make_docx_bytes())
        validate_upload_file(uploaded, ALLOWED)

    def test_disallowed_extension_is_rejected(self):
        uploaded = SimpleUploadedFile("malware.exe", b"MZ")
        with self.assertRaisesMessage(ValidationError, "Unsupported file extension"):
            validate_upload_file(uploaded, ALLOWED)

    @override_settings(AI_MAX_UPLOAD_MB=1)
    def test_oversize_file_is_rejected(self):
        uploaded = SimpleUploadedFile("big.txt", b"x" * (1024 * 1024 + 1))
        with self.assertRaisesMessage(ValidationError, "maximum allowed size"):
            validate_upload_file(uploaded, ALLOWED)

    def test_corrupt_zip_is_rejected(self):
        uploaded = SimpleUploadedFile("broken.docx", b"this is not a zip archive")
        with self.assertRaisesMessage(ValidationError, "not a valid archive"):
            validate_upload_file(uploaded, ALLOWED)

    def test_zip_bomb_ratio_is_rejected(self):
        uploaded = SimpleUploadedFile("bomb.docx", make_zip_bomb_bytes())
        with self.assertRaisesMessage(ValidationError, "compression ratio"):
            validate_upload_file(uploaded, ALLOWED)
