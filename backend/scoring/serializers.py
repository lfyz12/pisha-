from rest_framework import serializers

from .models import ScoringLog


class ScoringLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringLog
        fields = ["id", "activity_type", "points", "participant_count", "created_at"]
