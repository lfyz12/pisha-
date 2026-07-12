from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list_view(request):
    notifications = Notification.objects.all()
    serializer = NotificationSerializer(notifications, many=True)
    return Response({"data": serializer.data, "status": 200})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_read_view(request, pk):
    notification = get_object_or_404(Notification, pk=pk)
    notification.read = True
    notification.save(update_fields=["read"])
    return Response({"data": NotificationSerializer(notification).data, "status": 200})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read_view(request):
    Notification.objects.update(read=True)
    return Response({"data": None, "status": 200})
