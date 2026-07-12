import re
import uuid

from django.contrib.auth import get_user_model
from django.db import transaction

from students.models import Activity, Attendance, Event, Student

from .parsers import ExcelEvent, ExcelStudentRaw

User = get_user_model()


def _detect_course(group_name: str) -> int:
    match = re.search(r"(\d)", group_name)
    return int(match.group(1)) if match else 3


def _make_initials(name: str) -> str:
    parts = name.split()
    return "".join(p[0] for p in parts[:2]).upper()


def _make_student_id(group_name: str, idx: int) -> str:
    if group_name:
        return f"{group_name}-{str(idx + 1).zfill(3)}"
    return f"STU-{str(idx + 1).zfill(4)}"


@transaction.atomic
def persist_imported_data(students: list[ExcelStudentRaw], events: list[ExcelEvent]):
    default_password = "1234"
    students_imported = 0
    events_imported = 0

    for idx, raw in enumerate(students):
        course = _detect_course(raw.group_name)
        readable_id = _make_student_id(raw.group_name, idx)

        if Student.objects.filter(student_id=readable_id).exists():
            continue

        if User.objects.filter(username=readable_id).exists():
            continue

        student_id = uuid.uuid4()
        student = Student.objects.create(
            id=student_id,
            name=raw.full_name,
            initials=_make_initials(raw.full_name),
            student_id=readable_id,
            course=course,
            group_name=raw.group_name,
            rating=raw.average_score,
            status=Student.Status.ACTIVE,
            total_score=raw.total_score,
            average_score=raw.average_score,
        )

        User.objects.create_user(
            id=student_id,
            username=readable_id,
            password=default_password,
            first_name=raw.full_name,
            role=User.Role.STUDENT,
            group_name=raw.group_name,
        )

        Attendance.objects.bulk_create(
            [
                Attendance(student=student, week_index=i, value=value)
                for i, value in enumerate(raw.attendance)
            ]
        )

        activities = []
        for name, points in raw.science_activity.items():
            activities.append(Activity(student=student, category=Activity.Category.SCIENCE, name=name, points=points))
        for name, points in raw.project_activity.items():
            activities.append(Activity(student=student, category=Activity.Category.PROJECT, name=name, points=points))
        for name, points in raw.extracurricular.items():
            activities.append(Activity(student=student, category=Activity.Category.EXTRACURRICULAR, name=name, points=points))
        Activity.objects.bulk_create(activities)

        students_imported += 1

    for e in events:
        _, created = Event.objects.get_or_create(
            name=e.name,
            category=e.category,
            date=e.date,
            level=e.level,
            defaults={"status": e.status, "points": e.points},
        )
        if created:
            events_imported += 1

    return {"students_imported": students_imported, "events_imported": events_imported}
