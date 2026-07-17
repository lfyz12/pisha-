"""Service layer for student rating, dashboard analytics and activities.

These functions are used both by the REST views and by the AI assistant tools
so that the agent and the API share the same calculation logic.
"""

from students.models import Activity, Attendance, Event, Student


def _get_student_for_user(user):
    """Return the Student profile that shares the user's UUID."""
    return Student.objects.get(pk=user.id)


def get_student_rating(user):
    """Return the current student's rating context.

    Keys: rank, total_score, trend, academic_score, activity_score,
    activity_level, my_place, top_score, average_score.
    """
    student = _get_student_for_user(user)

    students = list(Student.objects.prefetch_related("activities"))
    students.sort(key=lambda s: -s.total_score)

    student_index = next(
        (i for i, s in enumerate(students) if s.id == student.id), len(students)
    )
    rank = student_index + 1

    prev = students[student_index - 1] if student_index > 0 else None
    diff = round(student.total_score - prev.total_score, 1) if prev else 0
    trend = "up" if diff > 0 else "down" if diff < 0 else "stable"

    activity_score = round(
        sum(a.points for a in student.activities.all()), 1
    )
    academic_score = round(student.average_score, 2)
    total_score = round(student.total_score, 2)

    top_score = round(max((s.total_score for s in students), default=0), 2)
    average_score = round(
        sum(s.total_score for s in students) / len(students), 1
    ) if students else 0

    avg_activity = (
        round(
            sum(
                sum(a.points for a in s.activities.all()) for s in students
            )
            / len(students),
            1,
        )
        if students
        else 0
    )

    activity_level = "Средняя"
    if activity_score > avg_activity:
        activity_level = "Высокая"
    elif activity_score < avg_activity * 0.5:
        activity_level = "Низкая"

    return {
        "rank": rank,
        "total_score": total_score,
        "trend": trend,
        "academic_score": academic_score,
        "activity_score": activity_score,
        "activity_level": activity_level,
        "my_place": rank,
        "top_score": top_score,
        "average_score": average_score,
    }


def get_dashboard_metrics():
    """Return the top-level dashboard metrics."""
    from django.db.models import Avg

    total = Student.objects.count()
    avg_gpa = Student.objects.aggregate(avg=Avg("average_score"))["avg"] or 0

    attendance_avg = 0.0
    attendances = Attendance.objects.all()
    if attendances.exists():
        total_val = sum(a.value for a in attendances)
        avg = total_val / attendances.count()
        if avg <= 1:
            avg *= 100
        attendance_avg = round(min(100, avg), 1)

    projects = Activity.objects.filter(category=Activity.Category.PROJECT).count()

    return {
        "totalStudents": total,
        "totalStudentsChange": 0,
        "averageGpa": round(avg_gpa, 2),
        "attendance": attendance_avg,
        "projects": projects,
        "newRequests": 0,
    }


def get_gpa_distribution():
    """Return the GPA distribution as relative bucket values."""
    buckets = [
        (0, 2, "< 2.0"),
        (2, 3, "2.0–3.0"),
        (3, 3.5, "3.0–3.5"),
        (3.5, 4, "3.5–4.0"),
        (4, 4.5, "4.0–4.5"),
        (4.5, 5, "4.5–5.0"),
    ]
    counts = [0] * len(buckets)
    for student in Student.objects.all():
        for i, (lo, hi, _label) in enumerate(buckets):
            if lo <= student.average_score < hi:
                counts[i] += 1
                break

    max_count = max(counts + [1])
    return [
        {"label": label, "value": round((count / max_count) * 100)}
        for count, (_lo, _hi, label) in zip(counts, buckets)
    ]


def get_attendance_trends():
    """Return weekly attendance averages."""
    from django.db.models import Max

    max_week = Attendance.objects.aggregate(
        max_week=Max("week_index")
    )["max_week"]
    if max_week is None:
        return []

    data = []
    for week in range(max_week + 1):
        values = list(
            Attendance.objects.filter(week_index=week).values_list(
                "value", flat=True
            )
        )
        avg = sum(values) / len(values) if values else 0
        if avg <= 1:
            avg *= 100
        pct = round(min(100, avg), 1)
        data.append({"month": f"Нед {week + 1}", "value": pct})
    return data


def get_rating_analytics():
    """Aggregate all dashboard analytics for the AI assistant."""
    return {
        "metrics": get_dashboard_metrics(),
        "gpa_distribution": get_gpa_distribution(),
        "attendance_trends": get_attendance_trends(),
    }


def get_student_activities(user):
    """Return the student's activities enriched with matching Event data."""
    student = _get_student_for_user(user)
    activities = Activity.objects.filter(student=student)
    event_names = {e.name: e for e in Event.objects.filter(name__in=[a.name for a in activities])}

    result = []
    for activity in activities:
        event = event_names.get(activity.name)
        result.append(
            {
                "category": activity.category,
                "name": activity.name,
                "points": activity.points,
                "event_date": event.date if event else None,
                "event_level": event.level if event else None,
            }
        )
    return result
