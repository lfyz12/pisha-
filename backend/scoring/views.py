from django.db import models, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import AdminFullyAuthenticated, FullyAuthenticated
from security.models import AccessPolicy, audit_event

from students.models import Student

from .models import ScoringLog, ScoringParticipant
from .serializers import ScoringCreateSerializer, ScoringLogSerializer


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def scoring_logs_view(request):
    if request.user.role == "student" and not AccessPolicy.current().allow_scoring_logs:
        return Response({"message": "Not permitted", "status": 403}, status=status.HTTP_403_FORBIDDEN)
    logs = ScoringLog.objects.all()[:50]
    serializer = ScoringLogSerializer(logs, many=True)
    return Response({"data": serializer.data, "status": 200})


@api_view(["POST"])
@permission_classes([AdminFullyAuthenticated])
@transaction.atomic
def create_scoring_view(request):
    input_data = {
        "activityType": request.data.get("activityType", request.data.get("activity_type")),
        "points": request.data.get("points"),
        "participantCount": request.data.get("participantCount", request.data.get("participant_count")),
        "studentIds": request.data.get("studentIds", request.data.get("student_ids")),
    }
    input_serializer = ScoringCreateSerializer(data=input_data)
    input_serializer.is_valid(raise_exception=True)
    values = input_serializer.validated_data
    student_ids = values["studentIds"]
    students = list(Student.objects.select_for_update().filter(pk__in=student_ids))
    if len(students) != len(student_ids):
        return Response({"message": "One or more students do not exist", "status": 400}, status=status.HTTP_400_BAD_REQUEST)

    log = ScoringLog.objects.create(
        activity_type=values["activityType"],
        points=values["points"],
        participant_count=values["participantCount"],
    )

    for student in students:
        ScoringParticipant.objects.create(log=log, student=student)
    Student.objects.filter(pk__in=student_ids).update(total_score=models.F("total_score") + values["points"])

    serializer = ScoringLogSerializer(log)
    audit_event(request, "scoring.created", target=str(log.id), metadata={"participants": len(student_ids)})
    return Response({"data": serializer.data, "status": status.HTTP_201_CREATED})
