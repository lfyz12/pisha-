"""Tests for the AI assistant agent tools and graph builder."""

from unittest.mock import MagicMock, patch

from django.test import TestCase
from langchain_core.messages import AIMessage

from ai_assistant.agent.graph import build_agent
from ai_assistant.agent.tools import make_tools
from ai_assistant.models import GrantCategory, KBDocument, StudentProject
from scholarships.models import Scholarship
from students.models import Activity, Event, Student
from users.models import User


def _make_student_user(username, **student_kwargs):
    user = User.objects.create_user(
        username=username, password="secret", role=User.Role.STUDENT
    )
    defaults = {
        "id": user.id,
        "name": f"{username} name",
        "initials": "SN",
        "student_id": username,
        "course": 2,
        "group_name": "G-2",
        "total_score": 100,
        "average_score": 4.0,
    }
    defaults.update(student_kwargs)
    return user, Student.objects.create(**defaults)


class AgentToolTests(TestCase):
    def setUp(self):
        self.user, self.student = _make_student_user("agent-student")
        Activity.objects.create(
            student=self.student,
            category=Activity.Category.SCIENCE,
            name="Conference",
            points=15,
        )
        Event.objects.create(
            name="Conference",
            category="science",
            date="2025-06-01",
            level="national",
            status="approved",
            points=15,
        )
        self.tools = {t.name: t for t in make_tools(self.student)}

    def test_get_my_rating_returns_expected_keys(self):
        result = self.tools["get_my_rating"].invoke({})
        data = __import__("json").loads(result)
        self.assertIn("rank", data)
        self.assertIn("total_score", data)
        self.assertIn("trend", data)
        self.assertIn("activity_level", data)

    def test_get_rating_analytics_returns_aggregate(self):
        result = self.tools["get_rating_analytics"].invoke({})
        data = __import__("json").loads(result)
        self.assertIn("metrics", data)
        self.assertIn("gpa_distribution", data)
        self.assertIn("attendance_trends", data)

    def test_get_my_activities_enriched_with_event(self):
        result = self.tools["get_my_activities"].invoke({})
        data = __import__("json").loads(result)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Conference")
        self.assertEqual(data[0]["event_date"], "2025-06-01")
        self.assertEqual(data[0]["event_level"], "national")

    def test_get_my_projects_returns_ready_projects(self):
        StudentProject.objects.create(
            student=self.student,
            title="Pending project",
            summary="not ready",
            status=StudentProject.Status.PENDING,
        )
        ready = StudentProject.objects.create(
            student=self.student,
            title="Ready project",
            summary="ready summary",
            status=StudentProject.Status.READY,
        )
        category = GrantCategory.objects.first()
        if category:
            ready.categories.add(category)

        result = self.tools["get_my_projects"].invoke({})
        data = __import__("json").loads(result)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["title"], "Ready project")
        self.assertIn("categories", data[0])

    def test_list_grant_categories(self):
        result = self.tools["list_grant_categories"].invoke({})
        data = __import__("json").loads(result)
        self.assertIsInstance(data, list)
        if data:
            self.assertIn("slug", data[0])
            self.assertIn("doc_count", data[0])

    def test_list_scholarships(self):
        Scholarship.objects.create(
            title="Test scholarship",
            description="desc",
            required_score=90,
            amount=5000,
            type=Scholarship.Type.ACADEMIC,
        )
        result = self.tools["list_scholarships"].invoke({})
        data = __import__("json").loads(result)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["title"], "Test scholarship")
        self.assertIn("required_score", data[0])

    @patch("ai_assistant.agent.tools.rerank")
    @patch("ai_assistant.agent.tools.surreal.search")
    @patch("ai_assistant.agent.tools.get_embeddings")
    def test_search_grants_reranks_and_returns_docs(
        self, mock_get_embeddings, mock_search, mock_rerank
    ):
        mock_get_embeddings.return_value.embed_query.return_value = [0.1] * 1536
        doc = KBDocument.objects.create(
            title="Grant A",
            source_type=KBDocument.SourceType.URL,
            source_url="https://example.com/a",
            summary="A great grant",
            status=KBDocument.Status.READY,
        )
        category = GrantCategory.objects.first()
        if category:
            doc.categories.add(category)
        mock_search.return_value = [{"doc_id": str(doc.id), "text": "chunk"}]
        mock_rerank.return_value = [(0, 0.95)]

        result = self.tools["search_grants"].invoke({"query": "grant"})
        data = __import__("json").loads(result)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["title"], "Grant A")
        self.assertEqual(data[0]["source_url"], "https://example.com/a")


class AgentGraphTests(TestCase):
    def setUp(self):
        self.user, self.student = _make_student_user("graph-student", name="Иван Graph")

    @patch("ai_assistant.agent.graph.create_react_agent")
    @patch("ai_assistant.agent.graph.get_chat_llm")
    def test_build_agent_passes_student_name_in_system_prompt(
        self, _mock_llm, mock_create
    ):
        mock_create.return_value = MagicMock()
        graph = build_agent(self.student, project_summaries=[])
        self.assertIsNotNone(graph)
        mock_create.assert_called_once()
        _args, kwargs = mock_create.call_args
        prompt = kwargs.get("prompt")
        self.assertIsNotNone(prompt)
        self.assertIn(self.student.name, prompt.content)
