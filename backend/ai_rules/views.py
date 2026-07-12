from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIRule
from .serializers import AIRuleSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def ai_rule_list_create_view(request):
    if request.method == "GET":
        rules = AIRule.objects.all()
        serializer = AIRuleSerializer(rules, many=True)
        return Response({"data": serializer.data, "status": 200})

    serializer = AIRuleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({"data": serializer.data, "status": status.HTTP_201_CREATED})


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def ai_rule_detail_view(request, pk):
    rule = get_object_or_404(AIRule, pk=pk)

    if request.method == "GET":
        return Response({"data": AIRuleSerializer(rule).data, "status": 200})

    if request.method == "DELETE":
        rule.delete()
        return Response({"data": None, "status": status.HTTP_204_NO_CONTENT})

    serializer = AIRuleSerializer(rule, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({"data": serializer.data, "status": 200})
