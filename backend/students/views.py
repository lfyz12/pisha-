from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from users.permissions import AdminFullyAuthenticated, FullyAuthenticated
from security.models import AccessPolicy

from .models import Activity, Student
from .serializers import (
    StudentProfileSerializer,
    StudentSerializer,
    StudentUpdateSerializer,
)
from .services import (
    get_dashboard_metrics,
    get_gpa_distribution,
    get_attendance_trends,
    get_student_rating,
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
        if self.request.user.role == "student":
            policy = AccessPolicy.current()
            if not policy.allow_other_profiles:
                return qs.filter(pk=self.request.user.id)
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
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [AdminFullyAuthenticated()]
        return [FullyAuthenticated()]

    def _profile_response(self, student):
        data = StudentProfileSerializer(student).data
        if self.request.user.role == "student" and student.id != self.request.user.id:
            policy = AccessPolicy.current()
            if not policy.allow_other_attendance:
                data.pop("attendances", None)
                data.pop("attendance_pct", None)
            if not policy.allow_other_activities:
                data.pop("activities", None)
                data.pop("project_count", None)
        return Response({"data": data, "status": 200})

    def retrieve(self, request, *args, **kwargs):
        return self._profile_response(self.get_object())

    @action(detail=True, methods=["get"], permission_classes=[FullyAuthenticated])
    def profile(self, request, pk=None):
        return self._profile_response(self.get_object())


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
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
    policy = AccessPolicy.current()

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
                "name": student.name if request.user.role == "admin" or policy.show_names_in_rating else f"Студент #{i + 1}",
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

    if current:
        rating = get_student_rating(request.user, students=students)
        stats = {
            "myPlace": rating["my_place"],
            "myPlaceChange": 0,
            "topScore": rating["top_score"],
            "averageScore": rating["average_score"],
            "activityLevel": rating["activity_level"],
        }
    else:
        avg_score = (
            round(sum(s["totalScore"] for s in result) / len(result), 1)
            if result
            else 0
        )
        stats = {
            "myPlace": 0,
            "myPlaceChange": 0,
            "topScore": result[0]["totalScore"] if result else 0,
            "averageScore": avg_score,
            "activityLevel": "Средняя",
        }

    return Response({"data": {"students": result, "stats": stats}, "status": 200})


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def dashboard_metrics_view(request):
    return Response({"data": get_dashboard_metrics(), "status": 200})


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def gpa_distribution_view(request):
    return Response({"data": get_gpa_distribution(), "status": 200})


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def attendance_trends_view(request):
    return Response({"data": get_attendance_trends(), "status": 200})
