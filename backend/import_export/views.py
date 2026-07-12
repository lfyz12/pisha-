from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .parsers import (
    has_multi_level_header,
    parse_flat_excel_buffer,
    parse_rating_excel_buffer,
)
from .services import persist_imported_data


@api_view(["POST"])
@permission_classes([IsAdminUser])
def upload_excel_view(request):
    uploaded = request.FILES.get("file")
    parser = request.data.get("parser", "auto")

    if not uploaded:
        return Response(
            {"message": "No file provided", "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    buffer = uploaded.read()

    try:
        if parser == "multi":
            parsed = parse_rating_excel_buffer(buffer)
            students = parsed.students
            events = parsed.events
        elif parser == "flat":
            students = parse_flat_excel_buffer(buffer)
            events = []
        else:
            if has_multi_level_header(buffer):
                parsed = parse_rating_excel_buffer(buffer)
                students = parsed.students
                events = parsed.events
            else:
                students = parse_flat_excel_buffer(buffer)
                events = []

        summary = persist_imported_data(students, events)
        return Response({"data": summary, "status": 200})
    except Exception as exc:
        return Response(
            {"message": str(exc), "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )
