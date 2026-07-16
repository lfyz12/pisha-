from rest_framework import serializers

from .models import AccessPolicy, SecurityAuditLog


class AccessPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPolicy
        fields = [
            "show_names_in_rating",
            "allow_other_profiles",
            "allow_other_attendance",
            "allow_other_activities",
            "allow_scoring_logs",
            "allow_ai_rules",
            "allow_global_notifications",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class SecurityAuditLogSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = SecurityAuditLog
        fields = ["id", "actor", "event", "target", "ip_address", "metadata", "created_at"]
