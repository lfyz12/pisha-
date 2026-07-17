"""Compiled LangGraph agent for the AI consultant."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import SystemMessage
from langgraph.prebuilt import create_react_agent

from ai_assistant.agent.tools import make_tools
from ai_assistant.services.llm import get_chat_llm
from students.services import get_student_rating
from users.models import User


def build_agent(student, project_summaries: list[dict]) -> Any:
    """Build and return a compiled ReAct agent for ``student``.

    The returned object is a LangGraph compiled graph that can be invoked or
    streamed.  The system prompt is in Russian and includes the student's card
    plus a JSON snapshot of their ready projects.
    """
    student_user = User.objects.get(pk=student.id)
    rating = get_student_rating(student_user)

    system_prompt = (
        "Ты — ИИ-консультант УПИШ по рейтингу, грантам, стипендиям и траекториям развития. "
        "Отвечай только на основе данных, полученных из инструментов. "
        "Никогда не придумывай сроки, суммы или факты, которых нет в данных. "
        "Указывай названия грантов и стипендий конкретно. "
        "Давай конкретные шаги, которые студент может предпринять.\n\n"
        f"Карточка студента: {student.name}, группа {student.group_name}, курс {student.course}, "
        f"общий балл {rating['total_score']}, место {rating['rank']}, статус {student.status}.\n\n"
        "Проекты студента:\n"
        f"{json.dumps(project_summaries, ensure_ascii=False, separators=(',', ':'))}"
    )

    return create_react_agent(
        model=get_chat_llm(),
        tools=make_tools(student),
        prompt=SystemMessage(content=system_prompt),
    )
