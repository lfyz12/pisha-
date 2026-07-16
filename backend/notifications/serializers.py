from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "title", "message", "type", "read", "created_at"]

    def get_read(self, notification):
        read_ids = self.context.get("read_ids", set())
        return str(notification.id) in read_ids
