import json
from datetime import timedelta

from django.utils import timezone

from users.mfa import _fernet

from .models import CredentialBundle


def create_credential_bundle(owner, credentials: list[dict]) -> CredentialBundle:
    return CredentialBundle.objects.create(
        owner=owner,
        payload_encrypted=_fernet().encrypt(json.dumps(credentials).encode()).decode(),
        expires_at=timezone.now() + timedelta(minutes=10),
    )


def consume_credential_bundle(bundle: CredentialBundle) -> list[dict]:
    if bundle.consumed_at or bundle.expires_at <= timezone.now():
        raise ValueError("Credential bundle is unavailable")
    bundle.consumed_at = timezone.now()
    bundle.save(update_fields=["consumed_at"])
    return json.loads(_fernet().decrypt(bundle.payload_encrypted.encode()).decode())
