import uuid

from django.db import models


class Scholarship(models.Model):
    class Type(models.TextChoices):
        ACADEMIC = "academic", "Academic"
        ENHANCED = "enhanced", "Enhanced"
        ACHIEVEMENT = "achievement", "Achievement"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    required_score = models.FloatField()
    amount = models.IntegerField()
    type = models.CharField(max_length=20, choices=Type.choices)

    def __str__(self):
        return self.title
