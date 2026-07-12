import uuid

from django.db import models


class ScoringLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity_type = models.CharField(max_length=200)
    points = models.IntegerField()
    participant_count = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.activity_type} ({self.points} pts)"


class ScoringParticipant(models.Model):
    log = models.ForeignKey(ScoringLog, on_delete=models.CASCADE, related_name="participants")
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="scoring_participants"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["log", "student"], name="unique_scoring_participant")
        ]

    def __str__(self):
        return f"{self.student} in {self.log}"
