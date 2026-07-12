import base64
import hashlib
import secrets

import pyotp
from cryptography.fernet import Fernet
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .models import MfaDevice, RecoveryCode


def _fernet() -> Fernet:
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest()).decode()
    return Fernet(key.encode())


def create_or_replace_device(user) -> tuple[MfaDevice, str]:
    secret = pyotp.random_base32()
    device, _ = MfaDevice.objects.update_or_create(
        user=user,
        defaults={"secret_encrypted": _fernet().encrypt(secret.encode()).decode(), "confirmed_at": None},
    )
    return device, secret


def device_secret(device: MfaDevice) -> str:
    return _fernet().decrypt(device.secret_encrypted.encode()).decode()


def verify_totp(device: MfaDevice, code: str) -> bool:
    return pyotp.TOTP(device_secret(device)).verify(code, valid_window=1)


def create_recovery_codes(user, count: int = 10) -> list[str]:
    user.recovery_codes.all().delete()
    codes = [secrets.token_hex(8).upper() for _ in range(count)]
    RecoveryCode.objects.bulk_create([RecoveryCode(user=user, code_hash=make_password(code)) for code in codes])
    return codes


def use_recovery_code(user, code: str) -> bool:
    for recovery_code in user.recovery_codes.filter(used_at__isnull=True):
        if check_password(code, recovery_code.code_hash):
            recovery_code.used_at = timezone.now()
            recovery_code.save(update_fields=["used_at"])
            return True
    return False
