"""Tests for the AI assistant chat sessions and SSE streaming endpoint."""

from datetime import timedelta
import threading
from unittest.mock import MagicMock, patch

from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from langchain_core.messages import AIMessage
from rest_framework.test import APIClient

from ai_assistant.models import ChatMessage, ChatSession
from ai_assistant.services.chat_stream import sse_stream
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
        self._set_allow_ai_chat(True)

    def _set_allow_ai_chat(self, value):
        policy = AccessPolicy.current()
        policy.allow_ai_chat = value
        policy.save(update_fields=["allow_ai_chat"])

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

    def test_list_messages_returns_last_100_in_chronological_order(self):
        session = ChatSession.objects.create(student=self.student)
        base = timezone.now() - timedelta(seconds=200)
        for index in range(1, 106):
            message = ChatMessage.objects.create(
                session=session, role=ChatMessage.Role.USER, content=f"msg-{index}"
            )
            ChatMessage.objects.filter(pk=message.pk).update(
                created_at=base + timedelta(seconds=index)
            )

        url = f"{CHAT_SESSIONS_URL}{session.id}/messages/"
        response = self.client.get(url, secure=True)

        self.assertEqual(response.status_code, 200)
        contents = [m["content"] for m in response.data["data"]]
        self.assertEqual(len(contents), 100)
        self.assertEqual(contents[0], "msg-6")
        self.assertEqual(contents[-1], "msg-105")
        self.assertEqual(contents, [f"msg-{i}" for i in range(6, 106)])

    def test_list_forbidden_when_flag_off(self):
        self._set_allow_ai_chat(False)
        response = self.client.get(CHAT_SESSIONS_URL, secure=True)
        self.assertEqual(response.status_code, 403)
        self.assertIn("message", response.data)

    def test_create_forbidden_when_flag_off(self):
        self._set_allow_ai_chat(False)
        response = self.client.post(CHAT_SESSIONS_URL, {}, format="json", secure=True)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(ChatSession.objects.count(), 0)

    def test_delete_forbidden_when_flag_off(self):
        session = ChatSession.objects.create(student=self.student)
        self._set_allow_ai_chat(False)
        response = self.client.delete(
            f"{CHAT_SESSIONS_URL}{session.id}/", secure=True
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(ChatSession.objects.filter(pk=session.id).exists())

    def test_messages_forbidden_when_flag_off(self):
        session = ChatSession.objects.create(student=self.student)
        self._set_allow_ai_chat(False)
        url = f"{CHAT_SESSIONS_URL}{session.id}/messages/"
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, 403)


class ChatStreamTests(TransactionTestCase):
    # TransactionTestCase: the agent thread writes assistant messages from its
    # own DB connection, which cannot see TestCase's uncommitted transaction.
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
        self.assertEqual(response["Cache-Control"], "no-cache")
        self.assertEqual(response["X-Accel-Buffering"], "no")

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

    @patch("ai_assistant.views.build_agent")
    def test_history_contains_last_20_messages(self, mock_build_agent):
        session = ChatSession.objects.create(student=self.student)
        # Seed messages with past timestamps so the freshly saved user
        # message is the most recent one.
        base = timezone.now() - timedelta(seconds=100)
        for index in range(1, 26):
            role = ChatMessage.Role.USER if index % 2 else ChatMessage.Role.ASSISTANT
            message = ChatMessage.objects.create(
                session=session, role=role, content=f"msg-{index}"
            )
            ChatMessage.objects.filter(pk=message.pk).update(
                created_at=base + timedelta(seconds=index)
            )

        mock_graph = MagicMock()
        mock_graph.stream.return_value = [(AIMessage(content="ok"), {})]
        mock_build_agent.return_value = mock_graph

        response = self.client.post(
            self._stream_url(session), {"content": "new"}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 200)
        b"".join(response.streaming_content)

        args, _kwargs = mock_graph.stream.call_args
        history = args[0]["messages"]
        self.assertEqual(len(history), 20)
        contents = [m.content for m in history]
        self.assertEqual(contents[0], "msg-7")
        self.assertEqual(contents[-1], "new")

    @patch("ai_assistant.views.build_agent")
    def test_stream_throttled_after_30_requests(self, mock_build_agent):
        session = ChatSession.objects.create(student=self.student)
        mock_graph = MagicMock()
        mock_graph.stream.return_value = [(AIMessage(content="ok"), {})]
        mock_build_agent.return_value = mock_graph

        url = self._stream_url(session)
        statuses = []
        for _ in range(31):
            response = self.client.post(
                url, {"content": "hi"}, format="json", secure=True
            )
            statuses.append(response.status_code)
            if response.status_code == 200:
                # Consume so agent threads finish sequentially (SQLite in the
                # test DB serializes writers; concurrent writes would lock).
                b"".join(response.streaming_content)

        self.assertEqual(statuses.count(200), 30)
        self.assertEqual(statuses[-1], 429)

    @patch("ai_assistant.views.build_agent")
    def test_agent_build_failure_returns_503_without_saving_message(
        self, mock_build_agent
    ):
        mock_build_agent.side_effect = RuntimeError("llm config missing")
        session = ChatSession.objects.create(student=self.student)
        response = self.client.post(
            self._stream_url(session), {"content": "hi"}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("message", response.data)
        self.assertEqual(ChatMessage.objects.count(), 0)

    def test_stream_rejects_content_over_limit(self):
        session = ChatSession.objects.create(student=self.student)
        response = self.client.post(
            self._stream_url(session),
            {"content": "x" * 4001},
            format="json",
            secure=True,
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("message", response.data)
        self.assertEqual(ChatMessage.objects.count(), 0)

    @patch("ai_assistant.views.build_agent")
    def test_stream_emits_error_frame_on_agent_error(self, mock_build_agent):
        session = ChatSession.objects.create(student=self.student)
        mock_graph = MagicMock()
        mock_graph.stream.side_effect = RuntimeError("boom")
        mock_build_agent.return_value = mock_graph

        response = self.client.post(
            self._stream_url(session), {"content": "hi"}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 200)

        body = b"".join(response.streaming_content).decode("utf-8")
        self.assertIn('"type":"error"', body)

        # The user message was saved; no assistant text was produced or saved.
        roles = list(
            session.messages.order_by("created_at").values_list("role", flat=True)
        )
        self.assertEqual(roles, [ChatMessage.Role.USER])


class ChatStreamServiceTests(TransactionTestCase):
    """Unit tests for the SSE stream machinery itself (agent thread writes)."""

    def setUp(self):
        self.user, self.student = _make_student_user("svc-stream-student")
        self.session = ChatSession.objects.create(student=self.student)

    def test_disconnect_saves_partial_assistant_text(self):
        gate = threading.Event()
        finalized = threading.Event()

        def fake_stream(*_args, **_kwargs):
            yield (AIMessage(content="partial"), {})
            gate.wait(5)
            yield (AIMessage(content=" more"), {})

        graph = MagicMock()
        graph.stream.side_effect = fake_stream

        def on_finalize(text):
            if text:
                ChatMessage.objects.create(
                    session=self.session,
                    role=ChatMessage.Role.ASSISTANT,
                    content=text,
                )
            finalized.set()

        stream = sse_stream(graph, [], on_finalize)
        first_frame = next(stream)
        self.assertIn("partial", first_frame)

        # Client disconnects: the generator is closed, the agent thread is
        # signalled to stop between chunks and saves what it accumulated.
        stream.close()
        gate.set()
        self.assertTrue(finalized.wait(5))

        assistant = ChatMessage.objects.get(role=ChatMessage.Role.ASSISTANT)
        self.assertEqual(assistant.content, "partial")
