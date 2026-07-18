"""API views for the AI assistant knowledge base, student projects and chat.

Function-based views in the style of ai_rules.views: success responses use
the ``{data, status}`` envelope (paginated lists use AppPagination), errors
use ``{message, status}``. The SSE stream endpoint is the only one that does
not wrap its output in the envelope.
"""

import logging

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from pisha_backend.pagination import AppPagination
from security.models import AccessPolicy, audit_event
from students.models import Student
from users.permissions import FullyAuthenticated

from .agent.graph import build_agent
from .models import ChatMessage, ChatSession, GrantCategory, KBDocument, StudentProject
from .serializers import (
    GrantCategorySerializer,
    KBDocumentSerializer,
    StudentProjectSerializer,
)
from .services.chat_stream import SSE_HEADERS, build_history, sse_stream
from .services.surreal import TABLE_KB_CHUNK, TABLE_PROJECT_CHUNK, delete_doc_chunks
from .tasks import ingest_kb_document, process_student_project

logger = logging.getLogger(__name__)


def _is_admin(user):
    return getattr(user, "role", None) == "admin" or getattr(user, "is_staff", False)


class AIChatRateThrottle(UserRateThrottle):
    """Per-user rate throttle for the chat stream, scope ``ai_chat``."""

    scope = "ai_chat"


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


def _enqueue_ingest(task, instance):
    """Enqueue the ingest task for ``instance``; return a 503 on broker failure.

    On failure the instance is marked failed (never left pending), so the
    one-task-per-document discipline stays intact and the user can reingest.
    """
    try:
        task.delay(str(instance.id))
    except Exception as exc:  # noqa: BLE001 - broker errors must not 500
        logger.exception(
            "Failed to enqueue ingest for %s %s",
            type(instance).__name__,
            instance.id,
        )
        instance.status = instance.Status.FAILED
        instance.error = f"enqueue failed: {exc}"[:2000]
        update_fields = ["status", "error"]
        if hasattr(instance, "updated_at"):
            update_fields.append("updated_at")
        instance.save(update_fields=update_fields)
        return Response(
            {
                "message": "Failed to enqueue the ingest task",
                "status": status.HTTP_503_SERVICE_UNAVAILABLE,
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
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
    audit_event(request, "kb_document.created", target=str(document.id))
    enqueue_error = _enqueue_ingest(ingest_kb_document, document)
    if enqueue_error is not None:
        return enqueue_error
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
        if document.file:
            try:
                document.file.delete(save=False)
            except Exception:  # noqa: BLE001 - file cleanup must not fail the request
                logger.exception(
                    "Failed to delete file of KB document %s", document.id
                )
        audit_event(request, "kb_document.deleted", target=str(document.id))
        document.delete()
        return Response(
            {"data": None, "status": status.HTTP_204_NO_CONTENT},
            status=status.HTTP_204_NO_CONTENT,
        )

    data = {}
    if "title" in request.data:
        data["title"] = request.data["title"]
    if "categories" in request.data:
        # QueryDict (multipart) needs getlist, or only the last value survives.
        if hasattr(request.data, "getlist"):
            data["categories"] = request.data.getlist("categories")
        else:
            data["categories"] = request.data["categories"]
    if not data:
        # Nothing whitelisted to update: a no-op, so no audit event.
        return Response({"data": KBDocumentSerializer(document).data, "status": 200})
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

    # One ingest task per document: pending (queued) or processing (running).
    if document.status in (KBDocument.Status.PENDING, KBDocument.Status.PROCESSING):
        return Response(
            {
                "message": "An ingest task is already queued or running",
                "status": status.HTTP_409_CONFLICT,
            },
            status=status.HTTP_409_CONFLICT,
        )
    document.status = KBDocument.Status.PENDING
    document.error = ""
    document.save(update_fields=["status", "error", "updated_at"])
    enqueue_error = _enqueue_ingest(ingest_kb_document, document)
    if enqueue_error is not None:
        return enqueue_error
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


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([FullyAuthenticated])
def kb_category_detail_view(request, pk):
    if not _is_admin(request.user):
        return _forbidden()
    category = get_object_or_404(GrantCategory, pk=pk)

    if request.method == "GET":
        return Response({"data": GrantCategorySerializer(category).data, "status": 200})

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
    audit_event(request, "student_project.created", target=str(project.id))
    enqueue_error = _enqueue_ingest(process_student_project, project)
    if enqueue_error is not None:
        return enqueue_error
    return Response(
        {"data": StudentProjectSerializer(project).data, "status": status.HTTP_201_CREATED},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "DELETE"])
@permission_classes([FullyAuthenticated])
def project_detail_view(request, pk):
    if request.method == "GET":
        # Enforce the same access gate as the list endpoint; the owner check
        # below still scopes the project to the current student (or admin).
        student, error = _check_project_access(request)
        if error is not None:
            return error
        project = get_object_or_404(StudentProject, pk=pk, student=student)
        return Response({"data": StudentProjectSerializer(project).data, "status": 200})

    # DELETE stays owner-only without the policy check: users can always delete
    # their own data even if the AI chat feature is currently disabled.
    project = get_object_or_404(StudentProject, pk=pk, student_id=request.user.id)

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
    audit_event(request, "student_project.deleted", target=str(project.id))
    project.delete()
    return Response(
        {"data": None, "status": status.HTTP_204_NO_CONTENT},
        status=status.HTTP_204_NO_CONTENT,
    )


# ---------------------------------------------------------------------------
# Chat sessions and SSE streaming.
# ---------------------------------------------------------------------------

#: Maximum accepted length of a single chat message body.
CHAT_CONTENT_MAX_LENGTH = 4000


def _serialize_session(session):
    return {
        "id": str(session.id),
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


def _serialize_message(message):
    return {
        "id": str(message.id),
        "role": message.role,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
    }


def _get_student_or_403(user):
    """Return the Student profile or a 403 error response."""
    try:
        return Student.objects.get(pk=user.id), None
    except Student.DoesNotExist:
        return None, _forbidden("No student profile for this account")


def _check_ai_chat_access(request):
    """Return a 403 response unless the user is admin or allow_ai_chat is on."""
    if not (_is_admin(request.user) or AccessPolicy.current().allow_ai_chat):
        return _forbidden("AI chat is disabled")
    return None


@api_view(["GET", "POST"])
@permission_classes([FullyAuthenticated])
def chat_session_list_create_view(request):
    error = _check_ai_chat_access(request)
    if error is not None:
        return error
    student, error = _get_student_or_403(request.user)
    if error is not None:
        return error

    if request.method == "GET":
        sessions = ChatSession.objects.filter(student=student)
        paginator = AppPagination()
        page = paginator.paginate_queryset(sessions, request)
        data = [_serialize_session(s) for s in page]
        return paginator.get_paginated_response(data)

    title = str(request.data.get("title", "Новый чат")).strip()[:100]
    session = ChatSession.objects.create(student=student, title=title)
    return Response(
        {"data": _serialize_session(session), "status": status.HTTP_201_CREATED},
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([FullyAuthenticated])
def chat_session_delete_view(request, pk):
    error = _check_ai_chat_access(request)
    if error is not None:
        return error
    student, error = _get_student_or_403(request.user)
    if error is not None:
        return error
    session = get_object_or_404(ChatSession, pk=pk, student=student)
    # Messages are removed by the ON DELETE CASCADE on ChatMessage.session.
    session.delete()
    return Response(
        {"data": None, "status": status.HTTP_204_NO_CONTENT},
        status=status.HTTP_204_NO_CONTENT,
    )


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def chat_message_list_view(request, pk):
    error = _check_ai_chat_access(request)
    if error is not None:
        return error
    student, error = _get_student_or_403(request.user)
    if error is not None:
        return error
    session = get_object_or_404(ChatSession, pk=pk, student=student)
    # The most recent 100 messages, returned in chronological order.
    messages = list(session.messages.order_by("-created_at")[:100])[::-1]
    data = [_serialize_message(m) for m in messages]
    return Response({"data": data, "status": 200})


@api_view(["POST"])
@permission_classes([FullyAuthenticated])
@throttle_classes([AIChatRateThrottle])
def chat_stream_view(request, pk):
    """Stream the assistant response for a chat session via SSE."""
    error = _check_ai_chat_access(request)
    if error is not None:
        return error

    student, error = _get_student_or_403(request.user)
    if error is not None:
        return error

    session = get_object_or_404(ChatSession, pk=pk, student=student)

    content = str(request.data.get("content", "")).strip()
    if not content:
        return Response(
            {"message": "Message content is required", "status": status.HTTP_400_BAD_REQUEST},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(content) > CHAT_CONTENT_MAX_LENGTH:
        return Response(
            {"message": "Message content is too long", "status": status.HTTP_400_BAD_REQUEST},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ready_projects = list(
        StudentProject.objects.filter(student=student, status=StudentProject.Status.READY)
        .prefetch_related("categories")
    )
    project_summaries = [
        {
            "title": project.title,
            "summary": project.summary,
            "categories": [cat.name for cat in project.categories.all()],
        }
        for project in ready_projects
    ]

    # Build the agent (and its student card) before persisting anything: if
    # agent construction fails, the user message must not be saved.
    try:
        graph = build_agent(student, project_summaries)
    except Exception:  # noqa: BLE001 - the stream has not started yet; 503 is safe
        logger.exception("Failed to build agent for session %s", session.id)
        return Response(
            {
                "message": "AI assistant is temporarily unavailable",
                "status": status.HTTP_503_SERVICE_UNAVAILABLE,
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    ChatMessage.objects.create(
        session=session, role=ChatMessage.Role.USER, content=content
    )
    session.save(update_fields=["updated_at"])

    recent = list(session.messages.order_by("-created_at")[:20])[::-1]
    input_messages = build_history(recent)

    def save_assistant_message(text):
        """Persist the full or partial assistant reply, if any text arrived."""
        if not text:
            return
        ChatMessage.objects.create(
            session=session, role=ChatMessage.Role.ASSISTANT, content=text
        )
        session.save(update_fields=["updated_at"])

    stream = sse_stream(graph, input_messages, save_assistant_message)
    response = StreamingHttpResponse(stream, content_type="text/event-stream")
    for header, value in SSE_HEADERS.items():
        response[header] = value
    return response
