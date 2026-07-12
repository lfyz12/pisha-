from rest_framework import serializers

from .models import AIRule


class AIRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRule
        fields = ["id", "conditions", "actions", "is_active", "created_at"]
