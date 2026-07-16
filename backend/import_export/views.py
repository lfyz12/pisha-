import io
import zipfile

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from security.credentials import create_credential_bundle
from security.models import audit_event
from users.permissions import AdminFullyAuthenticated

from .parsers import has_multi_level_header, parse_flat_excel_buffer, parse_rating_excel_buffer
from .services import persist_imported_data


def _validate_xlsx(uploaded, buffer: bytes, parser: str):
    if parser not in {"auto", "multi", "flat"}:
        raise ValueError("Unsupported parser")
    if not uploaded.name.lower().endswith(".xlsx"):
        raise ValueError("Only .xlsx files are supported")
    if len(buffer) > settings.MAX_EXCEL_UPLOAD_BYTES:
        raise ValueError("File exceeds the maximum allowed size")
    try:
        with zipfile.ZipFile(io.BytesIO(buffer)) as archive:
            entries = archive.infolist()
            if len(entries) > settings.MAX_EXCEL_ARCHIVE_FILES:
                raise ValueError("Excel archive has too many files")
            if sum(entry.file_size for entry in entries) > settings.MAX_EXCEL_UNCOMPRESSED_BYTES:
                raise ValueError("Excel archive is too large when unpacked")
            if any(entry.compress_size and entry.file_size / entry.compress_size > 100 for entry in entries):
                raise ValueError("Excel archive compression ratio is unsafe")
    except zipfile.BadZipFile as exc:
        raise ValueError("Invalid .xlsx file") from exc


@api_view(["POST"])
@permission_classes([AdminFullyAuthenticated])
def upload_excel_view(request):
    uploaded = request.FILES.get("file")
    parser = str(request.data.get("parser", "auto"))
    if not uploaded:
        return Response({"message": "No file provided", "status": 400}, status=status.HTTP_400_BAD_REQUEST)

    try:
        buffer = uploaded.read()
        _validate_xlsx(uploaded, buffer, parser)
        if parser == "multi" or (parser == "auto" and has_multi_level_header(buffer)):
            parsed = parse_rating_excel_buffer(buffer)
            students, events = parsed.students, parsed.events
        else:
            students, events = parse_flat_excel_buffer(buffer), []
        result = persist_imported_data(students, events)
        credentials = result.pop("credentials")
        if credentials:
            result["credential_bundle_id"] = str(create_credential_bundle(request.user, credentials).id)
        audit_event(request, "import.completed", metadata={**result, "credentials_created": len(credentials)})
        return Response({"data": result, "status": 200})
    except ValueError as exc:
        return Response({"message": str(exc), "status": 400}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        audit_event(request, "import.failed")
        return Response({"message": "Unable to process the uploaded file", "status": 400}, status=status.HTTP_400_BAD_REQUEST)
