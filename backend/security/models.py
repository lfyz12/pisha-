import uuid

from django.conf import settings
from django.db import models


class AccessPolicy(models.Model):
    """Singleton policy controlling what an authenticated student may inspect."""

    singleton = models.BooleanField(default=True, unique=True, editable=False)
    show_names_in_rating = models.BooleanField(default=False)
    allow_other_profiles = models.BooleanField(default=False)
    allow_other_attendance = models.BooleanField(default=False)
    allow_other_activities = models.BooleanField(default=False)
    allow_scoring_logs = models.BooleanField(default=False)
    allow_ai_rules = models.BooleanField(default=False)
    allow_ai_chat = models.BooleanField(default=False)
    allow_global_notifications = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def current(cls):
        policy, _ = cls.objects.get_or_create(singleton=True)
        return policy


class SecurityAuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="security_audit_events",
        null=True,
        blank=True,
    )
    event = models.CharField(max_length=100)
    target = models.CharField(max_length=200, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class CredentialBundle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    payload_encrypted = models.TextField()
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)


def audit_event(request, event: str, target: str = "", metadata: dict | None = None):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip_address = forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
    SecurityAuditLog.objects.create(
        actor=request.user if getattr(request.user, "is_authenticated", False) else None,
        event=event,
        target=target,
        ip_address=ip_address or None,
        metadata=metadata or {},
    )
