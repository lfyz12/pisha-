import uuid

from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        SUCCESS = "success", "Success"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
