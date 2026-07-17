"""Tests for the AI assistant chat sessions and SSE streaming endpoint."""

from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone
from langchain_core.messages import AIMessage
from rest_framework.test import APIClient

from ai_assistant.models import ChatMessage, ChatSession
from security.models import AccessPolicy
from students.models import Student
from users.models import MfaDevice, User


CHAT_SESSIONS_URL = "/api/ai/chat/sessions/"


def _make_student_user(username):
    user = User.objects.create_user(
        username=username, password="secret", role=User.Role.STUDENT
    )
    student = Student.objects.create(
        id=user.id,
        name=f"{username} name",
        initials="SN",
        student_id=username,
        course=1,
        group_name="G-1",
    )
    return user, student


def _make_admin_user(username):
    user = User.objects.create_user(
        username=username, password="secret", role=User.Role.ADMIN
    )
    MfaDevice.objects.create(
        user=user, secret_encrypted="secret", confirmed_at=timezone.now()
    )
    return user


class ChatSessionTests(TestCase):
    def setUp(self):
        self.user, self.student = _make_student_user("chat-student")
        self.other_user, self.other_student = _make_student_user("chat-other")
        self.admin = _make_admin_user("chat-admin")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.other_client = APIClient()
        self.other_client.force_authenticate(self.other_user)

    def test_list_returns_only_own_sessions(self):
        own = ChatSession.objects.create(student=self.student, title="Own")
        ChatSession.objects.create(student=self.other_student, title="Other")
        response = self.client.get(CHAT_SESSIONS_URL, secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["data"][0]["id"], str(own.id))

    def test_create_session_with_default_title(self):
        response = self.client.post(CHAT_SESSIONS_URL, {}, format="json", secure=True)
        self.assertEqual(response.status_code, 201)
        session = ChatSession.objects.get()
        self.assertEqual(session.student, self.student)
        self.assertEqual(session.title, "Новый чат")

    def test_delete_own_session(self):
        session = ChatSession.objects.create(student=self.student)
        ChatMessage.objects.create(
            session=session, role=ChatMessage.Role.USER, content="hi"
        )
        response = self.client.delete(
            f"{CHAT_SESSIONS_URL}{session.id}/", secure=True
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ChatSession.objects.filter(pk=session.id).exists())
        self.assertEqual(ChatMessage.objects.count(), 0)

    def test_delete_foreign_session_returns_404(self):
        session = ChatSession.objects.create(student=self.other_student)
        response = self.client.delete(
            f"{CHAT_SESSIONS_URL}{session.id}/", secure=True
        )
        self.assertEqual(response.status_code, 404)
        self.assertTrue(ChatSession.objects.filter(pk=session.id).exists())

    def test_list_messages_for_own_session(self):
        session = ChatSession.objects.create(student=self.student)
        ChatMessage.objects.create(
            session=session, role=ChatMessage.Role.USER, content="one"
        )
        ChatMessage.objects.create(
            session=session, role=ChatMessage.Role.ASSISTANT, content="two"
        )
        url = f"{CHAT_SESSIONS_URL}{session.id}/messages/"
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 2)
        self.assertEqual(response.data["data"][0]["role"], "user")

    def test_list_messages_for_foreign_session_returns_404(self):
        session = ChatSession.objects.create(student=self.other_student)
        url = f"{CHAT_SESSIONS_URL}{session.id}/messages/"
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, 404)


class ChatStreamTests(TestCase):
    def setUp(self):
        self.user, self.student = _make_student_user("stream-student")
        self.other_user, self.other_student = _make_student_user("stream-other")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.policy = AccessPolicy.current()
        self.policy.allow_ai_chat = True
        self.policy.save(update_fields=["allow_ai_chat"])

    def _stream_url(self, session):
        return f"{CHAT_SESSIONS_URL}{session.id}/messages/stream/"

    def test_stream_disabled_flag_returns_403(self):
        self.policy.allow_ai_chat = False
        self.policy.save(update_fields=["allow_ai_chat"])
        session = ChatSession.objects.create(student=self.student)
        response = self.client.post(
            self._stream_url(session), {"content": "hi"}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("message", response.data)

    def test_stream_foreign_session_returns_404(self):
        session = ChatSession.objects.create(student=self.other_student)
        response = self.client.post(
            self._stream_url(session), {"content": "hi"}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 404)

    def test_stream_requires_content(self):
        session = ChatSession.objects.create(student=self.student)
        response = self.client.post(
            self._stream_url(session), {"content": ""}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 400)

    @patch("ai_assistant.views.build_agent")
    def test_stream_returns_sse_and_saves_messages(self, mock_build_agent):
        session = ChatSession.objects.create(student=self.student)
        mock_graph = MagicMock()
        mock_graph.stream.return_value = [
            (AIMessage(content="Привет"), {"chunk": 1}),
            (AIMessage(content="!"), {"chunk": 2}),
        ]
        mock_build_agent.return_value = mock_graph

        response = self.client.post(
            self._stream_url(session), {"content": "hi"}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/event-stream")

        body = b"".join(response.streaming_content).decode("utf-8")
        self.assertIn('"type":"token"', body)
        self.assertIn('"type":"done"', body)
        self.assertIn("Привет!", body)

        messages = list(session.messages.order_by("created_at"))
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0].role, ChatMessage.Role.USER)
        self.assertEqual(messages[0].content, "hi")
        self.assertEqual(messages[1].role, ChatMessage.Role.ASSISTANT)
        self.assertEqual(messages[1].content, "Привет!")
