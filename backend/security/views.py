from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import AdminFullyAuthenticated

from .credentials import consume_credential_bundle
from .models import AccessPolicy, CredentialBundle, SecurityAuditLog, audit_event
from .serializers import AccessPolicySerializer, SecurityAuditLogSerializer


@api_view(["GET", "PATCH"])
@permission_classes([AdminFullyAuthenticated])
def access_policy_view(request):
    policy = AccessPolicy.current()
    if request.method == "PATCH":
        serializer = AccessPolicySerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit_event(request, "access_policy.updated")
    else:
        serializer = AccessPolicySerializer(policy)
    return Response({"data": serializer.data, "status": 200})


@api_view(["GET"])
@permission_classes([AdminFullyAuthenticated])
def audit_log_view(request):
    logs = SecurityAuditLog.objects.select_related("actor").all()[:200]
    return Response({"data": SecurityAuditLogSerializer(logs, many=True).data, "status": 200})


@api_view(["POST"])
@permission_classes([AdminFullyAuthenticated])
def credential_bundle_view(request, bundle_id):
    bundle = CredentialBundle.objects.filter(id=bundle_id, owner=request.user).first()
    if bundle is None:
        return Response({"message": "Not found", "status": 404}, status=404)
    try:
        credentials = consume_credential_bundle(bundle)
    except ValueError:
        return Response({"message": "Credential bundle is unavailable", "status": 410}, status=410)
    audit_event(request, "import.credentials.downloaded", target=str(bundle.id))
    return Response({"data": {"credentials": credentials}, "status": 200})
