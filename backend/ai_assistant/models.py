import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class GrantCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class KBDocument(models.Model):
    class SourceType(models.TextChoices):
        FILE = "file", "File"
        URL = "url", "URL"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    source_type = models.CharField(max_length=10, choices=SourceType.choices)
    file = models.FileField(upload_to="kb/", null=True, blank=True)
    source_url = models.URLField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    error = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    categories = models.ManyToManyField(GrantCategory, blank=True, related_name="kb_documents")
    chunk_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        if bool(self.file) == bool(self.source_url):
            raise ValidationError(
                "Exactly one of file or source_url must be set."
            )
        if self.source_type == self.SourceType.FILE and not self.file:
            raise ValidationError(
                "A file must be uploaded when source_type is 'file'."
            )
        if self.source_type == self.SourceType.URL and not self.source_url:
            raise ValidationError(
                "source_url must be set when source_type is 'url'."
            )


class StudentProject(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="projects"
    )
    title = models.CharField(max_length=300)
    file = models.FileField(upload_to="projects/")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    error = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    categories = models.ManyToManyField(GrantCategory, blank=True, related_name="student_projects")
    chunk_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="chat_sessions"
    )
    title = models.CharField(max_length=100, default="Новый чат")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"
