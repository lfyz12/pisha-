from datetime import timedelta
import hmac

import pyotp
from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.middleware.csrf import get_token
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from security.models import audit_event

from .mfa import create_or_replace_device, create_recovery_codes, device_secret, use_recovery_code, verify_totp
from .models import LoginAttempt
from .serializers import ForgotPasswordSerializer

User = get_user_model()
MAX_LOGIN_FAILURES = 5
LOCK_DURATION = timedelta(minutes=15)


def _cookie_options(max_age: int):
    return {"max_age": max_age, "httponly": True, "secure": not settings.DEBUG, "samesite": "Strict", "path": "/"}


def _set_auth_cookies(response, refresh):
    response.set_cookie("access_token", str(refresh.access_token), **_cookie_options(15 * 60))
    response.set_cookie("refresh_token", str(refresh), **_cookie_options(7 * 24 * 60 * 60))


def _clear_auth_cookies(response):
    response.delete_cookie("access_token", path="/", samesite="Strict")
    response.delete_cookie("refresh_token", path="/", samesite="Strict")


def _initials(name: str) -> str:
    return "".join(part[0] for part in name.split()[:2]).upper()


def _find_user(login: str):
    if login.lower() == "admin":
        return User.objects.filter(role=User.Role.ADMIN).first()
    return User.objects.filter(username__iexact=login).first()


def _client_ip(request) -> str:
    return request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", "0.0.0.0")).split(",")[0].strip()


def _csrf_ok(request) -> bool:
    csrf_cookie = request.COOKIES.get("csrftoken", "")
    csrf_header = request.headers.get("X-CSRFToken", "")
    return bool(csrf_cookie and csrf_header and hmac.compare_digest(csrf_cookie, csrf_header))


def _attempt(login: str, ip_address: str) -> LoginAttempt:
    attempt, _ = LoginAttempt.objects.get_or_create(login=login.lower(), ip_address=ip_address)
    return attempt


def _login_step(user) -> str | None:
    if user.password_change_required:
        return "password_change_required"
    if user.role == User.Role.ADMIN:
        device = getattr(user, "mfa_device", None)
        if not device or not device.confirmed_at:
            return "mfa_setup_required"
    return None


def _user_data(user):
    return {
        "id": str(user.id),
        "name": user.get_full_name() or user.username,
        "initials": _initials(user.get_full_name() or user.username),
        "groupName": user.group_name,
        "role": user.role,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_view(request):
    return Response({"data": {"csrfToken": get_token(request)}, "status": 200})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    if not _csrf_ok(request):
        return Response({"message": "CSRF validation failed", "status": 403}, status=status.HTTP_403_FORBIDDEN)
    login = str(request.data.get("groupName", "")).strip()
    password = str(request.data.get("password", ""))
    mfa_code = str(request.data.get("mfaCode", "")).replace(" ", "")
    ip_address = _client_ip(request)
    if not login or not password:
        return Response({"message": "Invalid credentials", "status": 401}, status=status.HTTP_401_UNAUTHORIZED)

    attempt = _attempt(login, ip_address)
    if attempt.locked_until and attempt.locked_until > timezone.now():
        audit_event(request, "auth.login.rate_limited", metadata={"login": login.lower()})
        return Response({"message": "Invalid credentials", "status": 401}, status=status.HTTP_401_UNAUTHORIZED)

    user = _find_user(login)
    if user is None or not user.is_active or not user.check_password(password):
        attempt.failures += 1
        if attempt.failures >= MAX_LOGIN_FAILURES:
            attempt.locked_until = timezone.now() + LOCK_DURATION
        attempt.save(update_fields=["failures", "locked_until", "updated_at"])
        audit_event(request, "auth.login.failed", metadata={"login": login.lower()})
        return Response({"message": "Invalid credentials", "status": 401}, status=status.HTTP_401_UNAUTHORIZED)

    step = _login_step(user)
    if step is None and user.role == User.Role.ADMIN:
        device = user.mfa_device
        if not mfa_code:
            return Response({"data": {"user": _user_data(user), "nextStep": "mfa_required"}, "status": 202}, status=status.HTTP_202_ACCEPTED)
        if not (verify_totp(device, mfa_code) or use_recovery_code(user, mfa_code.upper())):
            audit_event(request, "auth.mfa.failed", target=str(user.id))
            return Response({"message": "Invalid credentials", "status": 401}, status=status.HTTP_401_UNAUTHORIZED)

    attempt.failures = 0
    attempt.locked_until = None
    attempt.save(update_fields=["failures", "locked_until", "updated_at"])
    refresh = RefreshToken.for_user(user)
    response = Response({"data": {"user": _user_data(user), "nextStep": step}, "status": 200})
    _set_auth_cookies(response, refresh)
    audit_event(request, "auth.login.succeeded", target=str(user.id), metadata={"next_step": step})
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_view(request):
    if not _csrf_ok(request):
        return Response({"message": "CSRF validation failed", "status": 403}, status=status.HTTP_403_FORBIDDEN)
    raw_refresh = request.COOKIES.get("refresh_token")
    if not raw_refresh:
        return Response({"message": "Authentication required", "status": 401}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        refresh = RefreshToken(raw_refresh)
        user = User.objects.get(id=refresh["user_id"], is_active=True)
        refresh.blacklist()
        new_refresh = RefreshToken.for_user(user)
    except Exception:
        response = Response({"message": "Authentication required", "status": 401}, status=status.HTTP_401_UNAUTHORIZED)
        _clear_auth_cookies(response)
        return response
    response = Response({"data": {"user": _user_data(user), "nextStep": _login_step(user)}, "status": 200})
    _set_auth_cookies(response, new_refresh)
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    raw_refresh = request.COOKIES.get("refresh_token")
    if raw_refresh:
        try:
            RefreshToken(raw_refresh).blacklist()
        except Exception:
            pass
    audit_event(request, "auth.logout")
    response = Response({"data": None, "status": 200})
    _clear_auth_cookies(response)
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    current_password = str(request.data.get("currentPassword", ""))
    new_password = str(request.data.get("newPassword", ""))
    if not request.user.check_password(current_password):
        return Response({"message": "Invalid credentials", "status": 400}, status=status.HTTP_400_BAD_REQUEST)
    password_validation.validate_password(new_password, request.user)
    request.user.set_password(new_password)
    request.user.password_change_required = False
    request.user.save(update_fields=["password", "password_change_required"])
    audit_event(request, "auth.password.changed")
    return Response({"data": {"nextStep": _login_step(request.user)}, "status": 200})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mfa_setup_view(request):
    if request.user.role != User.Role.ADMIN:
        return Response({"message": "MFA is only required for administrators", "status": 403}, status=status.HTTP_403_FORBIDDEN)
    device = getattr(request.user, "mfa_device", None)
    if device and not device.confirmed_at:
        # Reuse the pending device's secret so repeated setup screens
        # (re-login, remount) don't rotate it out from under the user.
        secret = device_secret(device)
    else:
        _, secret = create_or_replace_device(request.user)
    uri = pyotp.TOTP(secret).provisioning_uri(name=request.user.username, issuer_name="Pisha")
    audit_event(request, "auth.mfa.setup_started")
    return Response({"data": {"otpauthUri": uri}, "status": 200})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mfa_confirm_view(request):
    device = getattr(request.user, "mfa_device", None)
    code = str(request.data.get("code", "")).replace(" ", "")
    if not device or not verify_totp(device, code):
        return Response({"message": "Invalid authentication code", "status": 400}, status=status.HTTP_400_BAD_REQUEST)
    device.confirmed_at = timezone.now()
    device.save(update_fields=["confirmed_at"])
    recovery_codes = create_recovery_codes(request.user)
    audit_event(request, "auth.mfa.enabled")
    return Response({"data": {"recoveryCodes": recovery_codes}, "status": 200})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mfa_recovery_view(request):
    code = str(request.data.get("code", "")).upper()
    if not use_recovery_code(request.user, code):
        return Response({"message": "Invalid recovery code", "status": 400}, status=status.HTTP_400_BAD_REQUEST)
    audit_event(request, "auth.mfa.recovery_used")
    return Response({"data": {"nextStep": None}, "status": 200})


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password_view(request):
    serializer = ForgotPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    audit_event(
        request,
        "password_reset_requested",
        target=serializer.validated_data["groupName"],
    )
    return Response(
        {
            "data": {
                "message": "Если учётная запись существует, инструкция по сбросу пароля будет отправлена."
            },
            "status": 200,
        }
    )
