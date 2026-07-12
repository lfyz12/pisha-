from django.test import TestCase
from django.utils import timezone

from users.mfa import create_or_replace_device, create_recovery_codes, use_recovery_code, verify_totp
from users.models import LoginAttempt, User
from users.views import _initials


class AuthHelperTests(TestCase):
    databases = []

    def test_initials(self):
        self.assertEqual(_initials("Иван Петров"), "ИП")
        self.assertEqual(_initials("Anna"), "A")
        self.assertEqual(_initials(""), "")


class MfaSecurityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin", password="safe-password", role=User.Role.ADMIN)

    def test_totp_secret_is_encrypted_and_codes_are_one_time(self):
        device, secret = create_or_replace_device(self.user)
        self.assertNotEqual(device.secret_encrypted, secret)
        self.assertTrue(verify_totp(device, __import__("pyotp").TOTP(secret).now()))
        recovery = create_recovery_codes(self.user, count=1)[0]
        self.assertTrue(use_recovery_code(self.user, recovery))
        self.assertFalse(use_recovery_code(self.user, recovery))

    def test_login_attempt_is_keyed_by_login_and_ip(self):
        LoginAttempt.objects.create(login="admin", ip_address="127.0.0.1", locked_until=timezone.now())
        self.assertEqual(LoginAttempt.objects.count(), 1)

    def test_login_requires_csrf_cookie_and_header(self):
        response = self.client.post("/api/auth/login/", {"groupName": "admin", "password": "safe-password"}, secure=True)
        self.assertEqual(response.status_code, 403)
        self.client.get("/api/auth/csrf/", secure=True)
        csrf_token = self.client.cookies["csrftoken"].value
        response = self.client.post(
            "/api/auth/login/",
            {"groupName": "admin", "password": "safe-password"},
            HTTP_X_CSRFTOKEN=csrf_token,
            secure=True,
        )
        self.assertEqual(response.status_code, 200)

from django.db import IntegrityError

from users.mfa import create_recovery_codes
from users.models import RecoveryCode


class RecoveryCodeTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="user-a", password="pass", role=User.Role.STUDENT)
        self.user_b = User.objects.create_user(username="user-b", password="pass", role=User.Role.STUDENT)

    def test_recovery_codes_are_16_chars(self):
        codes = create_recovery_codes(self.user_a, count=1)
        self.assertEqual(len(codes[0]), 16)

    def test_same_code_hash_for_different_users_is_allowed(self):
        RecoveryCode.objects.create(user=self.user_a, code_hash="shared-hash")
        RecoveryCode.objects.create(user=self.user_b, code_hash="shared-hash")
        self.assertEqual(self.user_a.recovery_codes.count(), 1)
        self.assertEqual(self.user_b.recovery_codes.count(), 1)

    def test_duplicate_code_hash_for_same_user_is_rejected(self):
        RecoveryCode.objects.create(user=self.user_a, code_hash="duplicate-hash")
        with self.assertRaises(IntegrityError):
            RecoveryCode.objects.create(user=self.user_a, code_hash="duplicate-hash")
