"""Local test settings: SQLite, eager Celery, no external services."""

from pisha_backend.settings import *  # noqa: F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

LITELLM_BASE_URL = "http://localhost:4000"
LITELLM_API_KEY = "test-key"
