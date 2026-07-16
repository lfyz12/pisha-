from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import FullyAuthenticated

from security.models import AccessPolicy

from .models import Notification, NotificationRead
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def notification_list_view(request):
    if request.user.role == "student" and not AccessPolicy.current().allow_global_notifications:
        return Response({"data": [], "status": 200})
    notifications = Notification.objects.all()
    read_ids = set(
        NotificationRead.objects.filter(user=request.user, notification__in=notifications).values_list("notification_id", flat=True)
    )
    serializer = NotificationSerializer(notifications, many=True, context={"read_ids": {str(item) for item in read_ids}})
    return Response({"data": serializer.data, "status": 200})


@api_view(["PATCH"])
@permission_classes([FullyAuthenticated])
def mark_read_view(request, pk):
    notification = get_object_or_404(Notification, pk=pk)
    NotificationRead.objects.get_or_create(notification=notification, user=request.user)
    return Response({"data": NotificationSerializer(notification, context={"read_ids": {str(notification.id)}}).data, "status": 200})


@api_view(["POST"])
@permission_classes([FullyAuthenticated])
def mark_all_read_view(request):
    NotificationRead.objects.bulk_create(
        [NotificationRead(notification=notification, user=request.user) for notification in Notification.objects.all()],
        ignore_conflicts=True,
    )
    return Response({"data": None, "status": 200})
