from rest_framework import serializers

from .models import Activity, Attendance, Student


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            "id",
            "name",
            "initials",
            "student_id",
            "course",
            "group_name",
            "rating",
            "status",
            "total_score",
            "average_score",
        ]


class StudentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["rating", "status"]


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ["week_index", "value"]


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ["category", "name", "points"]


class StudentProfileSerializer(serializers.ModelSerializer):
    attendances = AttendanceSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    project_count = serializers.SerializerMethodField()
    attendance_pct = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = StudentSerializer.Meta.fields + [
            "attendances",
            "activities",
            "project_count",
            "attendance_pct",
        ]

    def get_project_count(self, obj: Student) -> int:
        return obj.activities.filter(category=Activity.Category.PROJECT).count()

    def get_attendance_pct(self, obj: Student) -> float:
        attendances = obj.attendances.all()
        if not attendances:
            return 0.0
        total = sum(a.value for a in attendances)
        avg = total / len(attendances)
        if avg <= 1:
            avg *= 100
        return round(min(100, avg), 1)
