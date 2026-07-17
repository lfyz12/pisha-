"""LangChain tools for the AI consultant.

Every tool returns a compact JSON string so it can be fed back to the LLM as
plain text.  Tools are created per-request via ``make_tools(student)`` so the
bound ``student`` is captured in each closure.
"""

from __future__ import annotations

import json
from typing import Any

from django.db.models import Count, Q
from langchain_core.tools import tool

from ai_assistant.models import GrantCategory, KBDocument, StudentProject
from ai_assistant.services import surreal
from ai_assistant.services.llm import get_embeddings, rerank
from scholarships.models import Scholarship
from students.services import (
    get_rating_analytics as get_rating_analytics_service,
    get_student_activities,
    get_student_rating,
)
from users.models import User


_RESULT_SEPARATORS = (",", ":")


def _json_compact(value: Any) -> str:
    """Serialize ``value`` to a compact JSON string."""
    return json.dumps(value, ensure_ascii=False, separators=_RESULT_SEPARATORS)


def make_tools(student):
    """Return a list of LangChain tools bound to ``student``."""
    student_user = User.objects.get(pk=student.id)

    @tool
    def get_my_rating() -> str:
        """Return the student's current rating, rank and activity level."""
        return _json_compact(get_student_rating(student_user))

    @tool
    def get_rating_analytics() -> str:
        """Return dashboard analytics: metrics, GPA distribution and attendance."""
        return _json_compact(get_rating_analytics_service())

    @tool
    def get_my_activities() -> str:
        """Return the student's activities enriched with event metadata."""
        return _json_compact(get_student_activities(student_user))

    @tool
    def get_my_projects() -> str:
        """Return the student's ready projects with titles, summaries and categories."""
        projects = StudentProject.objects.filter(
            student=student, status=StudentProject.Status.READY
        ).prefetch_related("categories")
        data = [
            {
                "title": project.title,
                "summary": project.summary,
                "categories": [cat.name for cat in project.categories.all()],
            }
            for project in projects
        ]
        return _json_compact(data)

    @tool
    def search_grants(query: str, categories: list[str] | None = None) -> str:
        """Search the knowledge base for grants matching ``query`` and ``categories``."""
        try:
            query_text = (query or "").strip()
            if not query_text:
                ready_projects = StudentProject.objects.filter(
                    student=student, status=StudentProject.Status.READY
                )
                summaries = [p.summary for p in ready_projects if p.summary]
                query_text = " ".join(summaries) if summaries else ""

            if not query_text:
                return _json_compact([])

            vector = get_embeddings().embed_query(query_text)
            rows = surreal.search(
                table="kb_chunk",
                query_vector=vector,
                query_text=query_text,
                categories=categories,
                limit=20,
            )

            docs_by_id: dict[str, KBDocument] = {}
            for row in rows:
                doc_id = str(row.get("doc_id", ""))
                if not doc_id or doc_id in docs_by_id:
                    continue
                try:
                    docs_by_id[doc_id] = KBDocument.objects.get(pk=doc_id)
                except KBDocument.DoesNotExist:
                    continue

            if not docs_by_id:
                return _json_compact([])

            doc_list = list(docs_by_id.values())
            candidate_texts = [
                f"{doc.title}. {doc.summary}" for doc in doc_list
            ]
            pairs = rerank(query_text, candidate_texts, top_n=6)

            results = []
            for index, _score in pairs[:6]:
                doc = doc_list[index]
                results.append(
                    {
                        "title": doc.title,
                        "summary": doc.summary,
                        "categories": [cat.name for cat in doc.categories.all()],
                        "source_url": doc.source_url,
                    }
                )
            return _json_compact(results)
        except Exception as exc:  # noqa: BLE001 - tools must not crash the agent
            return _json_compact({"error": f"search failed: {exc}"})

    @tool
    def list_grant_categories() -> str:
        """List active grant categories with the number of ready KB documents."""
        categories = (
            GrantCategory.objects.filter(is_active=True)
            .annotate(
                doc_count=Count(
                    "kb_documents",
                    filter=Q(kb_documents__status=KBDocument.Status.READY),
                )
            )
            .order_by("name")
        )
        data = [
            {"name": cat.name, "slug": cat.slug, "doc_count": cat.doc_count}
            for cat in categories
        ]
        return _json_compact(data)

    @tool
    def list_scholarships() -> str:
        """List available scholarships."""
        data = list(
            Scholarship.objects.all().values(
                "title", "required_score", "amount", "type"
            )
        )
        return _json_compact(data)

    return [
        get_my_rating,
        get_rating_analytics,
        get_my_activities,
        get_my_projects,
        search_grants,
        list_grant_categories,
        list_scholarships,
    ]
