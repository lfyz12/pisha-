import uuid

from django.db import models


class Student(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        AT_RISK = "at_risk", "At Risk"
        TOP_RESERVE = "top_reserve", "Top Reserve"
        EXPELLED = "expelled", "Expelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    initials = models.CharField(max_length=10)
    student_id = models.CharField(max_length=50, unique=True)
    course = models.PositiveSmallIntegerField()
    group_name = models.CharField(max_length=50)
    rating = models.FloatField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    total_score = models.FloatField(default=0)
    average_score = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-total_score", "name"]
        indexes = [
            models.Index(fields=["group_name"]),
            models.Index(fields=["course"]),
        ]

    def __str__(self):
        return self.name


class Attendance(models.Model):
    id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendances")
    week_index = models.PositiveSmallIntegerField()
    value = models.FloatField()

    class Meta:
        unique_together = ["student", "week_index"]


class Activity(models.Model):
    class Category(models.TextChoices):
        SCIENCE = "science", "Science"
        PROJECT = "project", "Project"
        EXTRACURRICULAR = "extracurricular", "Extracurricular"

    id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="activities")
    category = models.CharField(max_length=20, choices=Category.choices)
    name = models.CharField(max_length=200)
    points = models.FloatField(default=0)

    class Meta:
        verbose_name_plural = "activities"


class Event(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    date = models.CharField(max_length=50)
    level = models.CharField(max_length=100)
    status = models.CharField(max_length=100)
    points = models.FloatField(default=0)
