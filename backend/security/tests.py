"""Tests for the security access-policy endpoint."""

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from security.models import AccessPolicy
from users.models import MfaDevice, User


POLICY_URL = "/api/security/policy/"


def _make_admin_user(username):
    user = User.objects.create_user(
        username=username, password="secret", role=User.Role.ADMIN
    )
    MfaDevice.objects.create(
        user=user, secret_encrypted="secret", confirmed_at=timezone.now()
    )
    return user


class AccessPolicyViewTests(TestCase):
    def setUp(self):
        self.admin = _make_admin_user("policy-admin")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_get_policy_includes_allow_ai_chat(self):
        response = self.client.get(POLICY_URL, secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn("allow_ai_chat", response.data["data"])
        self.assertFalse(response.data["data"]["allow_ai_chat"])

    def test_patch_allow_ai_chat_persists_the_flag(self):
        response = self.client.patch(
            POLICY_URL, {"allow_ai_chat": True}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["data"]["allow_ai_chat"])
        self.assertTrue(AccessPolicy.current().allow_ai_chat)

        response = self.client.patch(
            POLICY_URL, {"allow_ai_chat": False}, format="json", secure=True
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AccessPolicy.current().allow_ai_chat)
