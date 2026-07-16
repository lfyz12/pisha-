from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import AdminFullyAuthenticated, FullyAuthenticated
from security.models import AccessPolicy, audit_event

from .models import AIRule
from .serializers import AIRuleSerializer


def _is_admin(user):
    return getattr(user, "role", None) == "admin" or getattr(user, "is_staff", False)


@api_view(["GET", "POST"])
@permission_classes([FullyAuthenticated])
def ai_rule_list_create_view(request):
    if request.method == "GET":
        if request.user.role == "student" and not AccessPolicy.current().allow_ai_rules:
            return Response({"message": "Not permitted", "status": status.HTTP_403_FORBIDDEN}, status=status.HTTP_403_FORBIDDEN)
        rules = AIRule.objects.all()
        serializer = AIRuleSerializer(rules, many=True)
        return Response({"data": serializer.data, "status": 200})

    if not _is_admin(request.user):
        return Response(
            {"data": None, "status": status.HTTP_403_FORBIDDEN},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = AIRuleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    audit_event(request, "ai_rule.created", target=str(serializer.instance.id))
    return Response({"data": serializer.data, "status": status.HTTP_201_CREATED})


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([FullyAuthenticated])
def ai_rule_detail_view(request, pk):
    rule = get_object_or_404(AIRule, pk=pk)

    if request.method == "GET":
        if request.user.role == "student" and not AccessPolicy.current().allow_ai_rules:
            return Response({"message": "Not permitted", "status": status.HTTP_403_FORBIDDEN}, status=status.HTTP_403_FORBIDDEN)
        return Response({"data": AIRuleSerializer(rule).data, "status": 200})

    if not _is_admin(request.user):
        return Response(
            {"data": None, "status": status.HTTP_403_FORBIDDEN},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "DELETE":
        audit_event(request, "ai_rule.deleted", target=str(rule.id))
        rule.delete()
        return Response({"data": None, "status": status.HTTP_204_NO_CONTENT})

    serializer = AIRuleSerializer(rule, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    audit_event(request, "ai_rule.updated", target=str(rule.id))
    return Response({"data": serializer.data, "status": 200})
