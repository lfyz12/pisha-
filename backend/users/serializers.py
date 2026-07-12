from rest_framework import serializers


class ForgotPasswordSerializer(serializers.Serializer):
    groupName = serializers.CharField(required=True, max_length=150)
