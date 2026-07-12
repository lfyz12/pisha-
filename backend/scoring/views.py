from django.db import models, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from students.models import Student

from .models import ScoringLog, ScoringParticipant
from .serializers import ScoringLogSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scoring_logs_view(request):
    logs = ScoringLog.objects.all()[:50]
    serializer = ScoringLogSerializer(logs, many=True)
    return Response({"data": serializer.data, "status": 200})


@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def create_scoring_view(request):
    activity_type = request.data.get("activity_type") or request.data.get(
        "activityType", ""
    )
    points = int(request.data.get("points", 0))
    participant_count = int(
        request.data.get("participant_count") or request.data.get("participantCount", 0)
    )
    student_ids = request.data.get("studentIds") or request.data.get("student_ids", [])

    log = ScoringLog.objects.create(
        activity_type=activity_type,
        points=points,
        participant_count=participant_count,
    )

    for sid in student_ids:
        try:
            student = Student.objects.get(pk=sid)
            ScoringParticipant.objects.create(log=log, student=student)
            Student.objects.filter(pk=sid).update(
                total_score=models.F("total_score") + points
            )
        except Student.DoesNotExist:
            pass

    serializer = ScoringLogSerializer(log)
    return Response({"data": serializer.data, "status": status.HTTP_201_CREATED})
