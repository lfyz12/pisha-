import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")
SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-development-key") if DEBUG else os.environ.get("SECRET_KEY", "")

if not DEBUG and (not SECRET_KEY or SECRET_KEY.startswith("django-insecure-")):
    raise ImproperlyConfigured("SECRET_KEY must be a secure value when DEBUG=False")

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "users",
    "students",
    "import_export",
    "scoring",
    "scholarships",
    "notifications",
    "ai_rules",
    "server",
    "security",
    "ai_assistant",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "pisha_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "pisha_backend.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "pisha_db"),
        "USER": os.environ.get("POSTGRES_USER", "pisha"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "pisha_password"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Asia/Yekaterinburg"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_ROOT = os.environ.get("MEDIA_ROOT", BASE_DIR / "media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "users.permissions.FullyAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "pisha_backend.pagination.AppPagination",
    "PAGE_SIZE": 10,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Strict"
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = "Strict"
SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# Single source of truth for upload size limits; also caps AI assistant file uploads.
AI_MAX_UPLOAD_MB = int(os.environ.get("AI_MAX_UPLOAD_MB", "20"))
DATA_UPLOAD_MAX_MEMORY_SIZE = AI_MAX_UPLOAD_MB * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = AI_MAX_UPLOAD_MB * 1024 * 1024
MAX_EXCEL_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_EXCEL_ARCHIVE_FILES = 200
MAX_EXCEL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024

FIELD_ENCRYPTION_KEY = os.environ.get("FIELD_ENCRYPTION_KEY", "")
if not DEBUG and not FIELD_ENCRYPTION_KEY:
    raise ImproperlyConfigured("FIELD_ENCRYPTION_KEY must be set when DEBUG=False")

REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = [
    "rest_framework.throttling.AnonRateThrottle",
    "rest_framework.throttling.UserRateThrottle",
]
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"anon": "100/hour", "user": "1000/hour", "ai_chat": "30/hour"}

CELERY_BROKER_URL = os.environ.get(
    "CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0")
)
CELERY_RESULT_BACKEND = CELERY_BROKER_URL

LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000")
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY", "")
LITELLM_CHAT_MODEL = os.environ.get("LITELLM_CHAT_MODEL", "gpt-4o-mini")
LITELLM_EMBEDDING_MODEL = os.environ.get("LITELLM_EMBEDDING_MODEL", "text-embedding-3-small")
LITELLM_RERANK_MODEL = os.environ.get("LITELLM_RERANK_MODEL", "BAAI/bge-reranker-v2-m3")
LITELLM_CLASSIFIER_MODEL = os.environ.get("LITELLM_CLASSIFIER_MODEL") or LITELLM_CHAT_MODEL

SURREALDB_URL = os.environ.get("SURREALDB_URL", "ws://localhost:8000")
SURREALDB_NS = os.environ.get("SURREALDB_NS", "pisha")
SURREALDB_DB = os.environ.get("SURREALDB_DB", "pisha")
SURREALDB_USER = os.environ.get("SURREALDB_USER", "root")
# Accept both variable names; docker-compose passes SURREALDB_PASS, .env SURREALDB_PASSWORD.
SURREALDB_PASS = os.environ.get("SURREALDB_PASS") or os.environ.get("SURREALDB_PASSWORD", "")

AI_EMBEDDING_DIM = int(os.environ.get("AI_EMBEDDING_DIM", "1536"))
