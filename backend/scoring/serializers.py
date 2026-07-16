from rest_framework import serializers

from .models import ScoringLog


class ScoringLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringLog
        fields = ["id", "activity_type", "points", "participant_count", "created_at"]


class ScoringCreateSerializer(serializers.Serializer):
    activityType = serializers.CharField(max_length=200, trim_whitespace=True)
    points = serializers.IntegerField(min_value=-1000, max_value=1000)
    participantCount = serializers.IntegerField(min_value=1, max_value=1000)
    studentIds = serializers.ListField(
        child=serializers.UUIDField(), min_length=1, max_length=1000, allow_empty=False
    )

    def validate(self, attrs):
        ids = attrs["studentIds"]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError({"studentIds": "Student IDs must be unique."})
        if attrs["participantCount"] != len(ids):
            raise serializers.ValidationError({"participantCount": "Must match the number of students."})
        return attrs
