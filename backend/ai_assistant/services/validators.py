"""Validation of files uploaded to the AI knowledge base."""

from __future__ import annotations

import io
import zipfile

from django.conf import settings
from django.core.exceptions import ValidationError

#: Zip-based Office formats that require archive safety checks.
ZIP_BASED_EXTENSIONS = {".docx", ".pptx"}

#: Archive safety limits, modeled on import_export.views._validate_xlsx.
MAX_ARCHIVE_ENTRIES = 10_000
MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024
MAX_COMPRESSION_RATIO = 100


def _validate_zip_archive(uploaded_file) -> None:
    """Reject corrupt archives and zip bombs (entry count, unpacked size, ratio)."""
    try:
        buffer = uploaded_file.read()
    finally:
        uploaded_file.seek(0)
    try:
        with zipfile.ZipFile(io.BytesIO(buffer)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_ARCHIVE_ENTRIES:
                raise ValidationError("Archive has too many entries")
            if sum(entry.file_size for entry in entries) > MAX_UNCOMPRESSED_BYTES:
                raise ValidationError("Archive is too large when unpacked")
            if any(
                entry.compress_size and entry.file_size / entry.compress_size > MAX_COMPRESSION_RATIO
                for entry in entries
            ):
                raise ValidationError("Archive compression ratio is unsafe")
    except zipfile.BadZipFile as exc:
        raise ValidationError("File is not a valid archive") from exc


def validate_upload_file(uploaded_file, allowed_extensions) -> None:
    """Validate an uploaded file against an extension whitelist and size limit.

    Checks, in order: the file extension (case-insensitive) is in
    ``allowed_extensions``; the file size does not exceed
    ``settings.AI_MAX_UPLOAD_MB`` MiB; and, for zip-based formats
    (.docx/.pptx), the archive passes zip-bomb safety checks.

    Raises:
        django.core.exceptions.ValidationError: if any check fails.
    """
    name = getattr(uploaded_file, "name", "") or ""
    suffix = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    extension = f".{suffix}"
    allowed = {str(ext).lower() for ext in allowed_extensions}
    if extension not in allowed:
        raise ValidationError(f"Unsupported file extension '{extension}'")

    max_bytes = settings.AI_MAX_UPLOAD_MB * 1024 * 1024
    if uploaded_file.size > max_bytes:
        raise ValidationError(f"File exceeds the maximum allowed size of {settings.AI_MAX_UPLOAD_MB} MB")

    if extension in ZIP_BASED_EXTENSIONS:
        _validate_zip_archive(uploaded_file)
