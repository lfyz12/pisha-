from rest_framework import serializers

from .models import Scholarship


class ScholarshipSerializer(serializers.ModelSerializer):
    requiredScore = serializers.FloatField(source="required_score")

    class Meta:
        model = Scholarship
        fields = ["id", "title", "description", "requiredScore", "amount", "type"]
