from django.urls import path

from .views import access_policy_view, audit_log_view, credential_bundle_view

urlpatterns = [
    path("policy/", access_policy_view, name="access-policy"),
    path("audit-log/", audit_log_view, name="security-audit-log"),
    path("credential-bundles/<uuid:bundle_id>/consume/", credential_bundle_view, name="credential-bundle"),
]
