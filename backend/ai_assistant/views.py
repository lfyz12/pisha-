"""API views for the AI assistant knowledge base and student projects.

Function-based views in the style of ai_rules.views: success responses use
the ``{data, status}`` envelope (paginated lists use AppPagination), errors
use ``{message, status}``. KB documents and categories are admin-only;
student projects are available to admins and, once
``AccessPolicy.allow_ai_chat`` is enabled, to students with a Student
profile. Ingest tasks are enqueued via Celery; SurrealDB chunk cleanup on
delete is best-effort and never fails the request.
"""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from pisha_backend.pagination import AppPagination
from security.models import AccessPolicy, audit_event
from students.models import Student
from users.permissions import FullyAuthenticated

from .models import GrantCategory, KBDocument, StudentProject
from .serializers import (
    GrantCategorySerializer,
    KBDocumentSerializer,
    StudentProjectSerializer,
)
from .services.surreal import TABLE_KB_CHUNK, TABLE_PROJECT_CHUNK, delete_doc_chunks
from .tasks import ingest_kb_document, process_student_project

logger = logging.getLogger(__name__)


def _is_admin(user):
    return getattr(user, "role", None) == "admin" or getattr(user, "is_staff", False)


def _forbidden(message="Not permitted"):
    return Response(
        {"message": message, "status": status.HTTP_403_FORBIDDEN},
        status=status.HTTP_403_FORBIDDEN,
    )


def _get_student(user):
    """The Student profile sharing the user's id, or None."""
    try:
        return Student.objects.get(pk=user.id)
    except Student.DoesNotExist:
        return None


# ---------------------------------------------------------------------------
# Knowledge-base documents (admin only).
# ---------------------------------------------------------------------------


@api_view(["GET", "POST"])
@permission_classes([FullyAuthenticated])
def kb_document_list_create_view(request):
    if not _is_admin(request.user):
        return _forbidden()

    if request.method == "GET":
        documents = KBDocument.objects.prefetch_related("categories")
        paginator = AppPagination()
        page = paginator.paginate_queryset(documents, request)
        serializer = KBDocumentSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = KBDocumentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    document = serializer.save(created_by=request.user)
    ingest_kb_document.delay(str(document.id))
    return Response(
        {"data": KBDocumentSerializer(document).data, "status": status.HTTP_201_CREATED},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([FullyAuthenticated])
def kb_document_detail_view(request, pk):
    if not _is_admin(request.user):
        return _forbidden()
    document = get_object_or_404(KBDocument, pk=pk)

    if request.method == "GET":
        return Response({"data": KBDocumentSerializer(document).data, "status": 200})

    if request.method == "DELETE":
        try:
            delete_doc_chunks(TABLE_KB_CHUNK, str(document.id))
        except Exception:  # noqa: BLE001 - chunk cleanup must not fail the request
            logger.exception(
                "Failed to delete SurrealDB chunks for KB document %s", document.id
            )
        audit_event(request, "kb_document.deleted", target=str(document.id))
        document.delete()
        return Response(
            {"data": None, "status": status.HTTP_204_NO_CONTENT},
            status=status.HTTP_204_NO_CONTENT,
        )

    data = {
        key: request.data[key] for key in ("title", "categories") if key in request.data
    }
    serializer = KBDocumentSerializer(document, data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    audit_event(request, "kb_document.updated", target=str(document.id))
    return Response({"data": serializer.data, "status": 200})


@api_view(["POST"])
@permission_classes([FullyAuthenticated])
def kb_document_reingest_view(request, pk):
    if not _is_admin(request.user):
        return _forbidden()
    document = get_object_or_404(KBDocument, pk=pk)

    if document.status == KBDocument.Status.PROCESSING:
        return Response(
            {
                "message": "Document is already being processed",
                "status": status.HTTP_409_CONFLICT,
            },
            status=status.HTTP_409_CONFLICT,
        )
    document.status = KBDocument.Status.PENDING
    document.error = ""
    document.save(update_fields=["status", "error", "updated_at"])
    ingest_kb_document.delay(str(document.id))
    audit_event(request, "kb_document.reingested", target=str(document.id))
    return Response(
        {"data": KBDocumentSerializer(document).data, "status": status.HTTP_202_ACCEPTED},
        status=status.HTTP_202_ACCEPTED,
    )


# ---------------------------------------------------------------------------
# Knowledge-base categories.
# ---------------------------------------------------------------------------


@api_view(["GET", "POST"])
@permission_classes([FullyAuthenticated])
def kb_category_list_create_view(request):
    if request.method == "GET":
        categories = GrantCategory.objects.all()
        serializer = GrantCategorySerializer(categories, many=True)
        return Response({"data": serializer.data, "status": 200})

    if not _is_admin(request.user):
        return _forbidden()
    serializer = GrantCategorySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    audit_event(request, "kb_category.created", target=str(serializer.instance.id))
    return Response(
        {"data": serializer.data, "status": status.HTTP_201_CREATED},
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([FullyAuthenticated])
def kb_category_detail_view(request, pk):
    if not _is_admin(request.user):
        return _forbidden()
    category = get_object_or_404(GrantCategory, pk=pk)

    if request.method == "DELETE":
        audit_event(request, "kb_category.deleted", target=str(category.id))
        category.delete()
        return Response(
            {"data": None, "status": status.HTTP_204_NO_CONTENT},
            status=status.HTTP_204_NO_CONTENT,
        )

    serializer = GrantCategorySerializer(category, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    audit_event(request, "kb_category.updated", target=str(category.id))
    return Response({"data": serializer.data, "status": 200})


# ---------------------------------------------------------------------------
# Student projects.
# ---------------------------------------------------------------------------


def _check_project_access(request):
    """Gate for /api/ai/projects/: admin or an enabled allow_ai_chat policy.

    Returns (student, error_response); exactly one of the two is not None.
    Every caller also needs a Student profile, so admins without one are
    rejected just like students.
    """
    if not (_is_admin(request.user) or AccessPolicy.current().allow_ai_chat):
        return None, _forbidden()
    student = _get_student(request.user)
    if student is None:
        return None, _forbidden("No student profile for this account")
    return student, None


@api_view(["GET", "POST"])
@permission_classes([FullyAuthenticated])
def project_list_create_view(request):
    student, error = _check_project_access(request)
    if error is not None:
        return error

    if request.method == "GET":
        projects = StudentProject.objects.filter(student=student).prefetch_related(
            "categories"
        )
        paginator = AppPagination()
        page = paginator.paginate_queryset(projects, request)
        serializer = StudentProjectSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = StudentProjectSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    project = serializer.save(student=student)
    process_student_project.delay(str(project.id))
    return Response(
        {"data": StudentProjectSerializer(project).data, "status": status.HTTP_201_CREATED},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "DELETE"])
@permission_classes([FullyAuthenticated])
def project_detail_view(request, pk):
    # Scoped by owner: a foreign project's existence is not disclosed.
    project = get_object_or_404(StudentProject, pk=pk, student_id=request.user.id)

    if request.method == "GET":
        return Response({"data": StudentProjectSerializer(project).data, "status": 200})

    try:
        delete_doc_chunks(TABLE_PROJECT_CHUNK, str(project.id))
    except Exception:  # noqa: BLE001 - chunk cleanup must not fail the request
        logger.exception(
            "Failed to delete SurrealDB chunks for student project %s", project.id
        )
    try:
        project.file.delete(save=False)
    except Exception:  # noqa: BLE001 - file cleanup must not fail the request
        logger.exception("Failed to delete file of student project %s", project.id)
    project.delete()
    return Response(
        {"data": None, "status": status.HTTP_204_NO_CONTENT},
        status=status.HTTP_204_NO_CONTENT,
    )
