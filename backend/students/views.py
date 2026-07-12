from django.db.models import Avg, Max, Q
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .models import Activity, Attendance, Student
from .serializers import (
    StudentProfileSerializer,
    StudentSerializer,
    StudentUpdateSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by("-total_score", "name")
    serializer_class = StudentSerializer
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return StudentProfileSerializer
        if self.action in ["update", "partial_update"]:
            return StudentUpdateSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        qs = super().get_queryset()
        course = self.request.query_params.get("course")
        search = self.request.query_params.get("search", "").strip()
        if course:
            qs = qs.filter(course=course)
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(student_id__icontains=search)
                | Q(group_name__icontains=search)
            )
        return qs

    def get_permissions(self):
        if self.action in ["update", "partial_update"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def profile(self, request, pk=None):
        student = self.get_object()
        serializer = StudentProfileSerializer(student)
        return Response({"data": serializer.data, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rating_view(request):
    course = request.query_params.get("course")
    search = request.query_params.get("search", "").strip().lower()

    qs = Student.objects.prefetch_related("activities")
    if course:
        qs = qs.filter(course=int(course))
    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(group_name__icontains=search)
            | Q(student_id__icontains=search)
        )

    students = list(qs)
    students.sort(key=lambda s: -s.total_score)

    current_user_id = request.user.id if request.user.role == "student" else None

    result = []
    for i, student in enumerate(students):
        activity_score = round(sum(a.points for a in student.activities.all()), 1)
        prev = students[i - 1] if i > 0 else None
        diff = round(student.total_score - prev.total_score, 1) if prev else 0
        trend = "up" if diff > 0 else "down" if diff < 0 else "stable"
        is_current = current_user_id is not None and student.id == current_user_id

        result.append(
            {
                "id": str(student.id),
                "rank": i + 1,
                "name": student.name,
                "course": student.course,
                "group": student.group_name,
                "academicScore": round(student.average_score, 2),
                "activityScore": activity_score,
                "totalScore": round(student.total_score, 2),
                "trend": trend,
                "trendValue": abs(diff) if trend != "stable" else None,
                "isCurrentUser": is_current,
            }
        )

    current = next((s for s in result if s["isCurrentUser"]), None)
    avg_score = (
        round(sum(s["totalScore"] for s in result) / len(result), 1) if result else 0
    )
    avg_activity = (
        round(sum(s["activityScore"] for s in result) / len(result), 1)
        if result
        else 0
    )

    activity_level = "Средняя"
    if current:
        if current["activityScore"] > avg_activity:
            activity_level = "Высокая"
        elif current["activityScore"] < avg_activity * 0.5:
            activity_level = "Низкая"

    stats = {
        "myPlace": current["rank"] if current else 0,
        "myPlaceChange": 0,
        "topScore": result[0]["totalScore"] if result else 0,
        "averageScore": avg_score,
        "activityLevel": activity_level,
    }

    return Response({"data": {"students": result, "stats": stats}, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_metrics_view(request):
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

    data = {
        "totalStudents": total,
        "totalStudentsChange": 0,
        "averageGpa": round(avg_gpa, 2),
        "attendance": attendance_avg,
        "projects": projects,
        "newRequests": 0,
    }
    return Response({"data": data, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gpa_distribution_view(request):
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
    data = [
        {"label": label, "value": round((count / max_count) * 100)}
        for count, (_lo, _hi, label) in zip(counts, buckets)
    ]
    return Response({"data": data, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_trends_view(request):
    max_week = Attendance.objects.aggregate(max_week=Max("week_index"))["max_week"]
    if max_week is None:
        return Response({"data": [], "status": 200})

    data = []
    for week in range(max_week + 1):
        values = list(
            Attendance.objects.filter(week_index=week).values_list("value", flat=True)
        )
        avg = sum(values) / len(values) if values else 0
        if avg <= 1:
            avg *= 100
        pct = round(min(100, avg), 1)
        data.append({"month": f"Нед {week + 1}", "value": pct})

    return Response({"data": data, "status": 200})
