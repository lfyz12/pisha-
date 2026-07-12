# Backend for Pisha Implementation Plan (Django + PostgreSQL)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real Django backend with a PostgreSQL database that replaces the current in-browser mock data store, frontend-only Excel parsing, and hard-coded notification/scholarship/auth mocks.

**Architecture:** The repo is split into two workspaces: `frontend/` (React + Vite) and `backend/` (Django + Django REST Framework + PostgreSQL). Excel parsing logic currently in `frontend/src/lib/parse-rating-excel.ts` and `frontend/src/lib/import-excel.ts` is moved to the backend; the frontend uploads files via `multipart/form-data`, the backend parses and persists students, events, attendance, and activities. The frontend keeps its existing TanStack Query service layer and calls `/api/*` relative to its own origin. Production builds are produced with Docker: the frontend image builds the Vite app and serves it via nginx (proxying `/api` to the backend container), while the backend image runs Gunicorn + Django. The AI *execution/engine* is out of scope here; only AI-rule CRUD storage is wired up, the smart logic is left for the separate AI plan.

**Tech Stack:** Python 3.12, Django 5, Django REST Framework, `djangorestframework-simplejwt`, `django-cors-headers`, `psycopg2-binary`, `pandas`, `openpyxl`, `python-dotenv`, `gunicorn`. PostgreSQL 16. Frontend keeps React + Vite + TanStack Query + Zustand.

---

## File Structure

### New backend files

| File | Responsibility |
|------|----------------|
| `backend/requirements.txt` | Python dependencies. |
| `backend/manage.py` | Django management entry point. |
| `backend/.env.example` | Backend env vars (`SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `DEFAULT_ADMIN_PASSWORD`). |
| `backend/pisha_backend/settings.py` | Django settings, database, REST framework, JWT, CORS. |
| `backend/pisha_backend/urls.py` | Root URL routing under `/api/`. |
| `backend/pisha_backend/wsgi.py` | WSGI entry point. |
| `backend/users/models.py` | Custom `User` model with `role` (`student`/`admin`). |
| `backend/users/views.py` | JWT login view. |
| `backend/users/urls.py` | Auth routes. |
| `backend/students/models.py` | `Student`, `Attendance`, `Activity` models. |
| `backend/students/views.py` | Students list/detail, rating, dashboard metrics, status update. |
| `backend/students/serializers.py` | DRF serializers for student data. |
| `backend/students/urls.py` | Student/rating/dashboard routes. |
| `backend/import_export/parsers.py` | Ported Excel parsers (multi-level and flat headers). |
| `backend/import_export/services.py` | Persist parsed Excel data to DB. |
| `backend/import_export/views.py` | `POST /api/import/excel`. |
| `backend/scoring/models.py` | `ScoringLog` + `ScoringParticipant`. |
| `backend/scoring/views.py` | Scoring logs and create scoring. |
| `backend/scoring/serializers.py` | Scoring serializers. |
| `backend/scholarships/models.py` | `Scholarship` model + seed defaults. |
| `backend/scholarships/views.py` | Scholarship list. |
| `backend/notifications/models.py` | `Notification` model + seed defaults. |
| `backend/notifications/views.py` | Notifications list/mark-read. |
| `backend/ai_rules/models.py` | `AIRule` model (storage only). |
| `backend/ai_rules/views.py` | AI rules CRUD. |
| `backend/server/views.py` | Mock server metrics. |
| `backend/Dockerfile` | Python image with Gunicorn. |

### Modified frontend files

| File | Change |
|------|--------|
| `frontend/src/types/domain.ts` | Add `status: StudentStatus` to `Student`; define `StudentStatus` union. |
| `frontend/src/services/students.ts` | Add `updateStudentStatus`. |
| `frontend/src/services/import.ts` | New service: `uploadExcel(file, parser)` returning parsed summary. |
| `frontend/src/services/notification.ts` | Replace hard-coded mocks with API calls to `/notifications`. |
| `frontend/src/services/scholarship-service.ts` | Replace hard-coded mocks with API call to `/scholarships`. |
| `frontend/src/hooks/server/use-students.ts` | Add `useUpdateStudentStatus`. |
| `frontend/src/hooks/server/use-import.ts` | New hook for Excel upload mutation. |
| `frontend/src/stores/use-auth-store.ts` | Replace local mock login with backend `/auth/login` call; persist token; keep user shape. |
| `frontend/src/stores/use-mock-data-store.ts` | Delete (logic moves to backend DB). |
| `frontend/src/pages/auth/login/index.tsx` | Use backend auth; remove hard-coded `admin/1234` and local student-account creation. |
| `frontend/src/pages/rating/index.tsx` | Upload file to backend instead of parsing in browser; remove `useMockDataStore`. |
| `frontend/src/pages/admin/index.tsx` | Upload file to backend; show import summary; remove mock store. |
| `frontend/src/pages/dashboard/index.tsx` | Remove mock-store fallback; always show backend dashboard data. |
| `frontend/src/pages/dashboard/components/student-table.tsx` | Add status select + status update mutation; remove Excel-import fallback. |
| `frontend/src/pages/dashboard/components/scoring-form.tsx` | Use backend students list. |
| `frontend/src/pages/analytics/index.tsx` | Use backend rating data; remove mock store. |
| `frontend/src/pages/profile/index.tsx` | Use backend dashboard/rating endpoints; remove mock store. |
| `frontend/src/pages/scholarships/index.tsx` | Use backend scholarships store; remove mock store. |
| `frontend/package.json` | Frontend dependencies and scripts. |
| `frontend/.env.example` | Add `VITE_API_BASE_URL=/api`. |
| `frontend/vite.config.ts` | Add dev proxy `/api → http://localhost:8000`. |
| `frontend/Dockerfile` | Multi-stage build: Node build → nginx serve. |
| `frontend/nginx.conf` | Serve static files and proxy `/api` to backend. |
| `docker-compose.yml` (root) | Orchestrates frontend, backend, PostgreSQL. |
| `README.md` (root) | Updated setup instructions. |

---

## Phase 0: Local prerequisites

### Task 0.1: Confirm Python and Docker

**Files:** none

- [ ] **Step 1: Verify Python >= 3.12**

Run:

```bash
python3 --version
```

Expected output contains `3.12` or higher.

- [ ] **Step 2: Verify Docker and Docker Compose**

Run:

```bash
docker compose version
```

Expected: Docker Compose v2 or higher.

- [ ] **Step 3: Commit nothing yet**

No commit; this is a sanity check.

---

## Phase 1: Backend bootstrap

### Task 1.1: Create backend dependencies

**Files:**
- Create: `backend/requirements.txt`

- [ ] **Step 1: Write `backend/requirements.txt`**

```text
Django>=5.0,<5.1
djangorestframework>=3.15.0
djangorestframework-simplejwt>=5.3.0
django-cors-headers>=4.3.0
psycopg2-binary>=2.9.9
python-dotenv>=1.0.0
pandas>=2.2.0
openpyxl>=3.1.0
gunicorn>=22.0.0
```

- [ ] **Step 2: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore(backend): add python requirements"
```

### Task 1.2: Create Django project

**Files:** none

- [ ] **Step 1: Create Django project**

Run from repo root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
django-admin startproject pisha_backend .
```

Expected: `backend/manage.py` and `backend/pisha_backend/` created.

- [ ] **Step 2: Add `.gitignore` entries for Python**

Append to root `.gitignore`:

```text
/backend/.venv
/backend/__pycache__
/backend/**/*.pyc
/backend/**/*.pyo
/backend/db.sqlite3
/backend/.env
/backend/static
```

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "chore(backend): initialize django project"
```

### Task 1.3: Django settings with PostgreSQL and env vars

**Files:**
- Create: `backend/.env.example`
- Modify: `backend/pisha_backend/settings.py`

- [ ] **Step 1: Write `backend/.env.example`**

```text
SECRET_KEY=change-me-in-production
DEBUG=True
DATABASE_URL=postgres://pisha:pisha_password@localhost:5432/pisha_db
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost
DEFAULT_ADMIN_PASSWORD=1234
```

- [ ] **Step 2: Update `backend/pisha_backend/settings.py`**

Replace the contents with:

```python
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-dev-key")

DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "users",
    "students",
    "import_export",
    "scoring",
    "scholarships",
    "notifications",
    "ai_rules",
    "server",
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

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": 86400 * 7,  # 7 days
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

CORS_ALLOW_CREDENTIALS = True
```

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example backend/pisha_backend/settings.py backend/.gitignore
git commit -m "feat(backend): configure django settings with postgres and jwt"
```

### Task 1.4: Wire root URLs

**Files:**
- Modify: `backend/pisha_backend/urls.py`

- [ ] **Step 1: Replace contents**

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/import/", include("import_export.urls")),
    path("api/students/", include("students.urls")),
    path("api/rating/", include("students.rating_urls")),
    path("api/dashboard/", include("students.dashboard_urls")),
    path("api/scoring/", include("scoring.urls")),
    path("api/scholarships/", include("scholarships.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/ai-rules/", include("ai_rules.urls")),
    path("api/server/", include("server.urls")),
]
```

- [ ] **Step 2: Commit**

```bash
git add backend/pisha_backend/urls.py
git commit -m "feat(backend): wire api urls"
```

### Task 1.5: Run initial migrations

**Files:** none

- [ ] **Step 1: Make sure PostgreSQL is running locally**

For local development you can start Postgres via Docker:

```bash
docker run -d --name pisha-postgres \
  -e POSTGRES_DB=pisha_db \
  -e POSTGRES_USER=pisha \
  -e POSTGRES_PASSWORD=pisha_password \
  -p 5432:5432 \
  postgres:16
```

- [ ] **Step 2: Run migrations**

```bash
cd backend
source .venv/bin/activate
python manage.py migrate
```

Expected: migrations applied without errors.

- [ ] **Step 3: Commit**

No new files; no commit needed unless you want to commit migration files after creating apps.

---

## Phase 1.5: Project restructure & Docker

### Task 1.6: Move frontend files into `frontend/`

**Files:**
- Move to `frontend/`: `src/`, `public/`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.env.example`, `.prettierrc`, `.prettierignore`, `.oxlintrc.json`, `eslint.config.js`, `vercel.json`
- Keep at root: `.git/`, `.github/`, `.husky/`, `.vscode/`, `.editorconfig`, `.gitignore`, `README.md`, `commitlint.config.ts`, and the new `backend/` directory

- [ ] **Step 1: Move files and directories**

Run from repo root:

```bash
mkdir -p frontend
mv src public index.html vite.config.ts package.json package-lock.json \
   tsconfig.json tsconfig.app.json tsconfig.node.json .env.example \
   .prettierrc .prettierignore .oxlintrc.json eslint.config.js vercel.json frontend/
```

- [ ] **Step 2: Clean `frontend/package.json`**

Remove only the `prepare` field from `frontend/package.json` (husky is managed at the repo root). Keep `lint-staged` so frontend hooks run inside the `frontend/` workspace. The scripts block should keep `dev`, `build`, `preview`, `lint`, `lint:fix`, `format`, `format:check`, and `typecheck`; remove `prepare`.

- [ ] **Step 3: Update root `.gitignore`**

Keep the existing rules and add:

```text
/backend/.venv
/backend/__pycache__
/backend/**/*.pyc
/backend/**/*.pyo
/backend/db.sqlite3
/backend/static
/backend/data
/backend/.env
/frontend/node_modules
/frontend/dist
.env
```

- [ ] **Step 4: Commit the move**

```bash
git add -A
git commit -m "chore: move frontend files into frontend/ directory"
```

### Task 1.7: Create root `package.json` with Docker scripts

**Files:**
- Create: `package.json` (root)

- [ ] **Step 1: Write root `package.json`**

```json
{
  "name": "pisha",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "docker compose up --build",
    "build": "docker compose build",
    "start": "docker compose up -d",
    "stop": "docker compose down",
    "prepare": "husky",
    "lint": "cd frontend && npm run lint",
    "lint:fix": "cd frontend && npm run lint:fix",
    "format": "cd frontend && npm run format",
    "format:check": "cd frontend && npm run format:check",
    "typecheck": "cd frontend && npm run typecheck"
  },
  "devDependencies": {
    "husky": "^9.1.7"
  }
}
```

- [ ] **Step 2: Update Husky pre-commit hook**

Replace the contents of `.husky/pre-commit` with:

```bash
cd frontend && npx lint-staged
```

- [ ] **Step 3: Install root dev dependencies**

```bash
npm install
```

Expected: root `node_modules` created with husky; frontend `prepare` is no longer triggered during root install.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore .husky/pre-commit
git commit -m "chore(root): add docker orchestration scripts and husky"
```

### Task 1.8: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Write `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pisha_backend.settings

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pisha_backend.wsgi:application"]
```

- [ ] **Step 2: Write `backend/.dockerignore`**

```text
.venv
__pycache__
*.pyc
*.pyo
.env
db.sqlite3
static
```

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "chore(backend): add Dockerfile"
```

### Task 1.9: Frontend Dockerfile and nginx config

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Write `frontend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Write `frontend/nginx.conf`**

```nginx
server {
  listen 80;
  server_name localhost;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://backend:8000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

- [ ] **Step 3: Write `frontend/.dockerignore`**

```text
node_modules
dist
.env
.env.local
```

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore
git commit -m "chore(frontend): add Dockerfile and nginx config"
```

### Task 1.10: Root `docker-compose.yml`

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    container_name: pisha-db
    environment:
      - POSTGRES_DB=pisha_db
      - POSTGRES_USER=pisha
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-pisha_password}
    volumes:
      - pisha-postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - pisha-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pisha -d pisha_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: pisha-backend
    environment:
      - SECRET_KEY=${SECRET_KEY:-django-insecure-dev-key}
      - DEBUG=False
      - POSTGRES_DB=pisha_db
      - POSTGRES_USER=pisha
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-pisha_password}
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-http://localhost}
      - DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-1234}
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - pisha-network
    command: >
      sh -c "python manage.py migrate &&
             python manage.py seed_database &&
             gunicorn --bind 0.0.0.0:8000 pisha_backend.wsgi:application"

  frontend:
    build: ./frontend
    container_name: pisha-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - pisha-network

volumes:
  pisha-postgres-data:

networks:
  pisha-network:
    driver: bridge
```

- [ ] **Step 2: Create root `.env.example`**

```text
SECRET_KEY=change-me-in-production
POSTGRES_PASSWORD=pisha_password
CORS_ALLOWED_ORIGINS=http://localhost
DEFAULT_ADMIN_PASSWORD=1234
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker compose orchestration"
```

### Task 1.11: Configure frontend dev proxy and API base URL

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/.env.example`

- [ ] **Step 1: Add proxy to `frontend/vite.config.ts`**

Replace the file with:

```typescript
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 2: Update `frontend/.env.example`**

```text
VITE_API_BASE_URL=/api
```

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.ts frontend/.env.example
git commit -m "chore(frontend): configure api proxy and relative base url"
```

---

## Phase 2: Models

### Task 2.1: Create `users` app with custom User model

**Files:**
- Create: `backend/users/__init__.py`
- Create: `backend/users/apps.py`
- Create: `backend/users/models.py`
- Create: `backend/users/admin.py`

- [ ] **Step 1: Create app files**

`backend/users/__init__.py`: empty.

`backend/users/apps.py`:

```python
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"
```

`backend/users/models.py`:

```python
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        STUDENT = "student", "Student"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    group_name = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.get_full_name() or self.username
```

`backend/users/admin.py`:

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


admin.site.register(User, UserAdmin)
```

- [ ] **Step 2: Update settings app order**

Make sure `users` is listed before other apps in `INSTALLED_APPS` (it already is in Task 1.3).

- [ ] **Step 3: Commit**

```bash
git add backend/users/
git commit -m "feat(users): add custom user model"
```

### Task 2.2: Create `students` app and models

**Files:**
- Create: `backend/students/__init__.py`
- Create: `backend/students/apps.py`
- Create: `backend/students/models.py`

- [ ] **Step 1: Create app files**

`backend/students/__init__.py`: empty.

`backend/students/apps.py`:

```python
from django.apps import AppConfig


class StudentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "students"
```

`backend/students/models.py`:

```python
import uuid

from django.db import models


class Student(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        AT_RISK = "at_risk", "At Risk"
        TOP_RESERVE = "top_reserve", "Top Reserve"
        EXPELLED = "expelled", "Expelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    initials = models.CharField(max_length=10)
    student_id = models.CharField(max_length=50, unique=True)
    course = models.PositiveSmallIntegerField()
    group_name = models.CharField(max_length=50)
    rating = models.FloatField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    total_score = models.FloatField(default=0)
    average_score = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-total_score", "name"]
        indexes = [
            models.Index(fields=["group_name"]),
            models.Index(fields=["course"]),
        ]

    def __str__(self):
        return self.name


class Attendance(models.Model):
    id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendances")
    week_index = models.PositiveSmallIntegerField()
    value = models.FloatField()

    class Meta:
        unique_together = ["student", "week_index"]


class Activity(models.Model):
    class Category(models.TextChoices):
        SCIENCE = "science", "Science"
        PROJECT = "project", "Project"
        EXTRACURRICULAR = "extracurricular", "Extracurricular"

    id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="activities")
    category = models.CharField(max_length=20, choices=Category.choices)
    name = models.CharField(max_length=200)
    points = models.FloatField(default=0)

    class Meta:
        verbose_name_plural = "activities"


class Event(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    date = models.CharField(max_length=50)
    level = models.CharField(max_length=100)
    status = models.CharField(max_length=100)
    points = models.FloatField(default=0)
```

- [ ] **Step 2: Commit**

```bash
git add backend/students/
git commit -m "feat(students): add student, attendance, activity and event models"
```

### Task 2.3: Create `scoring` app and models

**Files:**
- Create: `backend/scoring/__init__.py`
- Create: `backend/scoring/apps.py`
- Create: `backend/scoring/models.py`

- [ ] **Step 1: Create app files**

`backend/scoring/__init__.py`: empty.

`backend/scoring/apps.py`:

```python
from django.apps import AppConfig


class ScoringConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "scoring"
```

`backend/scoring/models.py`:

```python
import uuid

from django.db import models


class ScoringLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity_type = models.CharField(max_length=200)
    points = models.IntegerField()
    participant_count = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ScoringParticipant(models.Model):
    log = models.ForeignKey(ScoringLog, on_delete=models.CASCADE, related_name="participants")
    student = models.ForeignKey("students.Student", on_delete=models.CASCADE)

    class Meta:
        unique_together = ["log", "student"]
```

- [ ] **Step 2: Commit**

```bash
git add backend/scoring/
git commit -m "feat(scoring): add scoring log models"
```

### Task 2.4: Create `scholarships`, `notifications`, `ai_rules`, `server` apps and models

**Files:**
- Create: `backend/scholarships/models.py`
- Create: `backend/notifications/models.py`
- Create: `backend/ai_rules/models.py`

- [ ] **Step 1: Create models**

`backend/scholarships/__init__.py`: empty.
`backend/scholarships/apps.py`:

```python
from django.apps import AppConfig


class ScholarshipsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "scholarships"
```

`backend/scholarships/models.py`:

```python
import uuid

from django.db import models


class Scholarship(models.Model):
    class Type(models.TextChoices):
        ACADEMIC = "academic", "Academic"
        ENHANCED = "enhanced", "Enhanced"
        ACHIEVEMENT = "achievement", "Achievement"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    required_score = models.FloatField()
    amount = models.IntegerField()
    type = models.CharField(max_length=20, choices=Type.choices)
```

`backend/notifications/__init__.py`: empty.
`backend/notifications/apps.py`:

```python
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"
```

`backend/notifications/models.py`:

```python
import uuid

from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        SUCCESS = "success", "Success"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
```

`backend/ai_rules/__init__.py`: empty.
`backend/ai_rules/apps.py`:

```python
from django.apps import AppConfig


class AiRulesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ai_rules"
```

`backend/ai_rules/models.py`:

```python
import uuid

from django.db import models


class AIRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conditions = models.JSONField()
    actions = models.JSONField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
```

`backend/server/__init__.py`: empty.
`backend/server/apps.py`:

```python
from django.apps import AppConfig


class ServerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "server"
```

`backend/server/models.py`: empty file (required by Django app).

- [ ] **Step 2: Commit**

```bash
git add backend/scholarships/ backend/notifications/ backend/ai_rules/ backend/server/
git commit -m "feat: add scholarship, notification, ai rule and server apps"
```

### Task 2.5: Create migrations

**Files:** none

- [ ] **Step 1: Generate migrations**

```bash
cd backend
source .venv/bin/activate
python manage.py makemigrations
```

Expected: migration files created for all apps.

- [ ] **Step 2: Apply migrations**

```bash
python manage.py migrate
```

Expected: all tables created in PostgreSQL.

- [ ] **Step 3: Commit**

```bash
git add backend/*/migrations/
git commit -m "chore: add django migrations"
```

---

## Phase 3: Authentication

### Task 3.1: JWT login view

**Files:**
- Create: `backend/users/urls.py`
- Create: `backend/users/views.py`
- Modify: `backend/pisha_backend/urls.py` (already wired in Task 1.4)

- [ ] **Step 1: Write `backend/users/views.py`**

```python
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def make_token_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "data": {
            "token": str(refresh.access_token),
            "user": {
                "id": str(user.id),
                "name": user.get_full_name() or user.username,
                "initials": _initials(user.get_full_name() or user.username),
                "groupName": user.group_name,
                "role": user.role,
            },
        },
        "status": 200,
    }


def _initials(name: str) -> str:
    parts = name.split()
    return "".join(p[0] for p in parts[:2]).upper()


def _find_user(login: str):
    if login.lower() == "admin":
        return User.objects.filter(role=User.Role.ADMIN).first()
    try:
        from students.models import Student

        student = Student.objects.get(student_id__iexact=login)
        return User.objects.filter(id=student.id).first()
    except Student.DoesNotExist:
        return None


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    login = request.data.get("groupName", "").strip()
    password = request.data.get("password", "")

    if not login or not password:
        return Response(
            {"message": "groupName and password are required", "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = _find_user(login)
    if user is None or not user.check_password(password):
        return Response(
            {"message": "Invalid credentials", "status": 401},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response(make_token_response(user))
```

- [ ] **Step 2: Write `backend/users/urls.py`**

```python
from django.urls import path

from . import views

urlpatterns = [
    path("login", views.login_view, name="login"),
]
```

- [ ] **Step 3: Commit**

```bash
git add backend/users/views.py backend/users/urls.py
git commit -m "feat(auth): add jwt login view"
```

### Task 3.2: Seed default admin user

**Files:**
- Create: `backend/users/management/__init__.py`
- Create: `backend/users/management/commands/__init__.py`
- Create: `backend/users/management/commands/seed_admin.py`

- [ ] **Step 1: Create management command**

`backend/users/management/__init__.py`: empty.
`backend/users/management/commands/__init__.py`: empty.
`backend/users/management/commands/seed_admin.py`:

```python
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create default admin user if it does not exist"

    def handle(self, *args, **options):
        if not User.objects.filter(username="admin").exists():
            password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "1234")
            User.objects.create_superuser(
                username="admin",
                password=password,
                role=User.Role.ADMIN,
                group_name="admin",
                first_name="Администратор",
            )
            self.stdout.write(self.style.SUCCESS("Default admin created"))
        else:
            self.stdout.write("Default admin already exists")
```

- [ ] **Step 2: Run the command locally**

```bash
cd backend
source .venv/bin/activate
python manage.py seed_admin
```

Expected: admin user created.

- [ ] **Step 3: Commit**

```bash
git add backend/users/management/
git commit -m "feat(auth): add default admin seed command"
```

---

## Phase 4: Port Excel parsing to backend

### Task 4.1: Multi-level-header parser

**Files:**
- Create: `backend/import_export/parsers.py`

- [ ] **Step 1: Write `backend/import_export/parsers.py` (multi-level part)**

```python
from dataclasses import dataclass, field
from typing import Any

import openpyxl


@dataclass
class ExcelStudentRaw:
    group_name: str
    full_name: str
    total_score: float
    average_score: float
    attendance: list[float] = field(default_factory=list)
    science_activity: dict[str, float] = field(default_factory=dict)
    project_activity: dict[str, float] = field(default_factory=dict)
    extracurricular: dict[str, float] = field(default_factory=dict)


@dataclass
class ExcelEvent:
    id: int
    name: str
    category: str
    date: str
    level: str
    status: str
    points: float


@dataclass
class ParsedExcelData:
    students: list[ExcelStudentRaw]
    events: list[ExcelEvent]


def _to_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _to_number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace(",", ".").replace(" ", "").replace("\u00a0", "")
        cleaned = "".join(c for c in cleaned if c.isdigit() or c == ".")
        if not cleaned:
            return 0.0
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


def _fill_forward(row: list[Any]) -> list[Any]:
    result = []
    last = None
    for cell in row:
        if cell not in (None, ""):
            last = cell
        result.append(last)
    return result


HEADER_KEYWORDS = ["групп", "фио", "номер", "балл", "посещаем", "категори", "успеваем"]


def _is_meta_row(row: list[str], idx: int) -> bool:
    first4 = row[:4]
    all_empty = all(not c for c in first4)
    if not all_empty:
        return False
    rest_text = [c for c in row[4:] if c]
    has_meta = any(
        "количеств" in t or "учебн" in t or "семестр" in t for t in rest_text
    )
    return has_meta or (idx == 0 and bool(rest_text))


def _is_header_row(row: list[str]) -> bool:
    first4 = row[:4]
    return any(
        any(kw in c for kw in HEADER_KEYWORDS) for c in first4 if c
    )


def parse_rating_excel_buffer(buffer: bytes) -> ParsedExcelData:
    workbook = openpyxl.load_workbook(filename=buffer, data_only=True)
    main_sheet = workbook.worksheets[0]
    raw_rows = [
        [_to_string(cell.value).lower() for cell in row]
        for row in main_sheet.iter_rows()
    ]
    events = _parse_events_sheet(workbook)
    students = _parse_main_sheet(raw_rows)
    return ParsedExcelData(students=students, events=events)


def _parse_events_sheet(workbook: openpyxl.Workbook) -> list[ExcelEvent]:
    events_sheet = next(
        (
            sheet
            for sheet in workbook.worksheets
            if "перечень" in sheet.title.lower() or "мероприя" in sheet.title.lower()
        ),
        None,
    )
    if events_sheet is None:
        return []

    rows = list(events_sheet.iter_rows(values_only=True))
    events = []
    for idx, row in enumerate(rows):
        if not row or len(row) < 7:
            continue
        events.append(
            ExcelEvent(
                id=_to_number(row[0]) or idx + 1,
                name=_to_string(row[1]),
                category=_to_string(row[2]),
                date=_to_string(row[3]),
                level=_to_string(row[4]),
                status=_to_string(row[5]),
                points=_to_number(row[6]),
            )
        )
    return events


def _parse_main_sheet(raw_rows: list[list[str]]) -> list[ExcelStudentRaw]:
    if len(raw_rows) < 4:
        return []

    header_start_index = 0
    for i in range(min(10, len(raw_rows))):
        row = raw_rows[i]
        if not row:
            continue
        if _is_meta_row(row, i):
            continue
        if _is_header_row(row):
            header_start_index = i
            break

    header_rows: list[list[str]] = []
    data_start_index = header_start_index
    for i in range(header_start_index, min(header_start_index + 5, len(raw_rows))):
        row = raw_rows[i]
        if not row:
            continue
        first_cell = row[0]
        is_still_header = (
            first_cell == ""
            or any(kw in first_cell for kw in HEADER_KEYWORDS)
            or len(header_rows) < 3
        )
        if is_still_header:
            header_rows.append(row)
        else:
            data_start_index = i
            break

    if len(header_rows) < 2:
        return []

    max_cols = max(len(r) for r in raw_rows) if raw_rows else 5
    filled_headers = []
    for r in header_rows:
        padded = r + [None] * (max_cols - len(r))
        filled_headers.append(_fill_forward(padded))

    num_header_rows = len(filled_headers)
    categories: list[dict[str, Any] | None] = []

    for col in range(max_cols):
        top_label = _to_string(filled_headers[0][col])
        sub_labels = [
            _to_string(filled_headers[h][col])
            for h in range(1, num_header_rows)
        ]

        if "групп" in top_label or "номер" in top_label:
            categories.append({"type": "base", "sub_key": "group_name"})
        elif any(kw in top_label for kw in ["фио", "фам", "имя", "студент"]):
            categories.append({"type": "base", "sub_key": "full_name"})
        elif "итогов" in top_label or ("балл" in top_label and "средн" not in top_label):
            categories.append({"type": "base", "sub_key": "total_score"})
        elif "средн" in top_label or ("балл" in top_label and "успеваем" in top_label):
            categories.append({"type": "base", "sub_key": "average_score"})
        elif "посещаем" in top_label or "образов" in top_label:
            week_label = next((s for s in sub_labels if s.isdigit()), f"week-{col}")
            categories.append({"type": "attendance", "sub_key": week_label})
        elif "научн" in top_label:
            label = sub_labels[0] if sub_labels else f"science-{col}"
            categories.append({"type": "science", "sub_key": label})
        elif "проект" in top_label:
            label = sub_labels[0] if sub_labels else f"project-{col}"
            categories.append({"type": "project", "sub_key": label})
        elif "внеучеб" in top_label or "внеуч" in top_label:
            label = sub_labels[0] if sub_labels else f"extracurr-{col}"
            categories.append({"type": "extracurricular", "sub_key": label})
        else:
            categories.append(None)

    students: list[ExcelStudentRaw] = []
    for i in range(data_start_index, len(raw_rows)):
        row = raw_rows[i]
        if not row:
            continue
        first_cell = _to_string(row[0])
        has_numeric = any(
            isinstance(cell, (int, float)) or (isinstance(cell, str) and any(c.isdigit() for c in cell))
            for cell in row
        )
        if not first_cell or (not first_cell.replace("-", "").replace(" ", "").isalpha() and not has_numeric):
            continue

        student = ExcelStudentRaw(group_name="", full_name="", total_score=0.0, average_score=0.0)
        attendance_map: dict[str, float] = {}
        science_map: dict[str, float] = {}
        project_map: dict[str, float] = {}
        extracurr_map: dict[str, float] = {}

        for col in range(min(len(row), len(categories))):
            cat = categories[col]
            if cat is None:
                continue
            cell_val = row[col]
            cat_type = cat["type"]
            sub_key = cat["sub_key"]

            if cat_type == "base":
                if sub_key == "group_name":
                    student.group_name = _to_string(cell_val)
                elif sub_key == "full_name":
                    student.full_name = _to_string(cell_val)
                elif sub_key == "total_score":
                    student.total_score = _to_number(cell_val)
                elif sub_key == "average_score":
                    student.average_score = _to_number(cell_val)
            elif cat_type == "attendance":
                attendance_map[sub_key] = _to_number(cell_val)
            elif cat_type == "science":
                science_map[sub_key] = _to_number(cell_val)
            elif cat_type == "project":
                project_map[sub_key] = _to_number(cell_val)
            elif cat_type == "extracurricular":
                extracurr_map[sub_key] = _to_number(cell_val)

        def sort_key(k: str):
            try:
                return (0, int(k))
            except ValueError:
                return (1, k)

        student.attendance = [attendance_map[k] for k in sorted(attendance_map.keys(), key=sort_key)]
        student.science_activity = science_map
        student.project_activity = project_map
        student.extracurricular = extracurr_map

        if student.full_name:
            students.append(student)

    return students
```

- [ ] **Step 2: Commit**

```bash
git add backend/import_export/parsers.py
git commit -m "feat(backend): port multi-level excel parser to python"
```

### Task 4.2: Flat-header parser

**Files:**
- Modify: `backend/import_export/parsers.py`

- [ ] **Step 1: Append flat parser**

Append to `backend/import_export/parsers.py`:

```python
COLUMN_MAP = {
    "место": "rank",
    "ранг": "rank",
    "номер": "rank",
    "rank": "rank",
    "студент": "name",
    "фио": "name",
    "имя": "name",
    "name": "name",
    "курс": "course",
    "course": "course",
    "группа": "group",
    "group": "group",
    "учеба": "academic_score",
    "баллы": "academic_score",
    "баллы (учеба)": "academic_score",
    "academic": "academic_score",
    "активность": "activity_score",
    "баллы (активность)": "activity_score",
    "activity": "activity_score",
    "общий балл": "total_score",
    "итого": "total_score",
    "сумма": "total_score",
    "всего": "total_score",
    "total": "total_score",
}


def _normalize_key(key: str) -> str:
    return key.lower().replace("_", " ").replace("-", " ").strip()


def parse_flat_excel_buffer(buffer: bytes) -> list[ExcelStudentRaw]:
    import pandas as pd

    df = pd.read_excel(buffer)
    mapped_keys: dict[str, str | None] = {}
    for key in df.columns:
        normalized = _normalize_key(str(key))
        mapped_keys[key] = COLUMN_MAP.get(normalized)

    def get(row, key_name):
        for original, mapped in mapped_keys.items():
            if mapped == key_name:
                return row.get(original, 0)
        return 0

    students = []
    for idx, row in df.iterrows():
        name = str(get(row, "name") or "").strip()
        course = int(_to_number(get(row, "course")))
        group = str(get(row, "group") or "").strip()
        academic_score = _to_number(get(row, "academic_score"))
        activity_score = _to_number(get(row, "activity_score"))
        total_score = _to_number(get(row, "total_score")) or (academic_score + activity_score)

        students.append(
            ExcelStudentRaw(
                group_name=group,
                full_name=name,
                total_score=total_score,
                average_score=academic_score,
                attendance=[],
                science_activity={},
                project_activity={},
                extracurricular={},
            )
        )
    return students


def has_multi_level_header(buffer: bytes) -> bool:
    import pandas as pd

    df = pd.read_excel(buffer, header=None, nrows=1)
    if df.empty:
        return False
    first_row = [str(c).lower() for c in df.iloc[0].tolist()]
    return any(
        kw in cell
        for cell in first_row
        for kw in ["категори", "посещаем", "научн", "проект", "внеучеб"]
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/import_export/parsers.py
git commit -m "feat(backend): add flat-header excel parser"
```

### Task 4.3: Persistence service

**Files:**
- Create: `backend/import_export/services.py`

- [ ] **Step 1: Write `backend/import_export/services.py`**

```python
import re
import uuid

from django.contrib.auth import get_user_model

from students.models import Activity, Attendance, Event, Student
from users.models import User

from .parsers import ExcelEvent, ExcelStudentRaw


def _detect_course(group_name: str) -> int:
    match = re.search(r"(\d)", group_name)
    return int(match.group(1)) if match else 3


def _make_initials(name: str) -> str:
    parts = name.split()
    return "".join(p[0] for p in parts[:2]).upper()


def _make_student_id(group_name: str, idx: int) -> str:
    if group_name:
        return f"{group_name}-{str(idx + 1).zfill(3)}"
    return f"STU-{str(idx + 1).zfill(4)}"


def persist_imported_data(students: list[ExcelStudentRaw], events: list[ExcelEvent]):
    default_password = "1234"

    for idx, raw in enumerate(students):
        student_id = uuid.uuid4()
        course = _detect_course(raw.group_name)
        readable_id = _make_student_id(raw.group_name, idx)

        student = Student.objects.create(
            id=student_id,
            name=raw.full_name,
            initials=_make_initials(raw.full_name),
            student_id=readable_id,
            course=course,
            group_name=raw.group_name,
            rating=raw.average_score,
            status=Student.Status.ACTIVE,
            total_score=raw.total_score,
            average_score=raw.average_score,
        )

        User.objects.create_user(
            id=student_id,
            username=readable_id,
            password=default_password,
            first_name=raw.full_name,
            role=User.Role.STUDENT,
            group_name=raw.group_name,
        )

        Attendance.objects.bulk_create(
            [
                Attendance(student=student, week_index=i, value=value)
                for i, value in enumerate(raw.attendance)
            ]
        )

        activities = []
        for name, points in raw.science_activity.items():
            activities.append(Activity(student=student, category=Activity.Category.SCIENCE, name=name, points=points))
        for name, points in raw.project_activity.items():
            activities.append(Activity(student=student, category=Activity.Category.PROJECT, name=name, points=points))
        for name, points in raw.extracurricular.items():
            activities.append(Activity(student=student, category=Activity.Category.EXTRACURRICULAR, name=name, points=points))
        Activity.objects.bulk_create(activities)

    Event.objects.bulk_create(
        [
            Event(
                name=e.name,
                category=e.category,
                date=e.date,
                level=e.level,
                status=e.status,
                points=e.points,
            )
            for e in events
        ]
    )

    return {"students_imported": len(students), "events_imported": len(events)}
```

- [ ] **Step 2: Commit**

```bash
git add backend/import_export/services.py
git commit -m "feat(backend): add import persistence service"
```

---

## Phase 5: REST API

### Phase 5 files

| File | Responsibility |
|------|----------------|
| `backend/pisha_backend/pagination.py` | Custom DRF pagination returning `{data, total, page, pageSize, totalPages}`. |
| `backend/import_export/__init__.py` | App marker. |
| `backend/import_export/apps.py` | App config. |
| `backend/import_export/urls.py` | `/api/import/excel` route. |
| `backend/import_export/views.py` | File upload view. |
| `backend/students/serializers.py` | Serializers for `Student`, `Attendance`, `Activity`. |
| `backend/students/views.py` | Student CRUD, status update, rating, dashboard, student profile action. |
| `backend/students/urls.py` | `/api/students/` CRUD routes. |
| `backend/students/rating_urls.py` | `/api/rating/` route. |
| `backend/students/dashboard_urls.py` | `/api/dashboard/{metrics,gpa-distribution,attendance-trends}` routes. |
| `backend/scoring/serializers.py` | `ScoringLog` serializer. |
| `backend/scoring/views.py` | Scoring logs and create scoring. |
| `backend/scoring/urls.py` | Scoring routes. |
| `backend/scholarships/serializers.py` | `Scholarship` serializer mapping to frontend shape. |
| `backend/scholarships/views.py` | Scholarship list. |
| `backend/scholarships/urls.py` | Scholarship routes. |
| `backend/notifications/serializers.py` | `Notification` serializer. |
| `backend/notifications/views.py` | Notifications list/mark-read. |
| `backend/notifications/urls.py` | Notification routes. |
| `backend/ai_rules/serializers.py` | `AIRule` serializer. |
| `backend/ai_rules/views.py` | AI rules CRUD. |
| `backend/ai_rules/urls.py` | AI rules routes. |
| `backend/server/views.py` | Mock server metrics. |
| `backend/server/urls.py` | Server metrics route. |
| `backend/server/management/commands/seed_database.py` | Seed admin + scholarships + notifications. |
| `backend/students/tests.py` | Smoke test for student creation. |
| `backend/import_export/tests.py` | Parser smoke test. |

---

### Task 5.1: Create `import_export` app config and fix parser I/O

**Files:**
- Create: `backend/import_export/__init__.py`
- Create: `backend/import_export/apps.py`
- Modify: `backend/import_export/parsers.py`

- [ ] **Step 1: Create app files**

`backend/import_export/__init__.py`: empty.

`backend/import_export/apps.py`:

```python
from django.apps import AppConfig


class ImportExportConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "import_export"
```

- [ ] **Step 2: Update parsers to accept bytes via `io.BytesIO`**

At the top of `backend/import_export/parsers.py` add:

```python
import io
```

Change the first line of `parse_rating_excel_buffer` from:

```python
workbook = openpyxl.load_workbook(filename=buffer, data_only=True)
```

to:

```python
workbook = openpyxl.load_workbook(filename=io.BytesIO(buffer), data_only=True)
```

Change the first line of `parse_flat_excel_buffer` from:

```python
df = pd.read_excel(buffer)
```

to:

```python
df = pd.read_excel(io.BytesIO(buffer))
```

Change the first line of `has_multi_level_header` from:

```python
df = pd.read_excel(buffer, header=None, nrows=1)
```

to:

```python
df = pd.read_excel(io.BytesIO(buffer), header=None, nrows=1)
```

- [ ] **Step 3: Commit**

```bash
git add backend/import_export/
git commit -m "feat(import): add app config and accept bytes io"
```

---

### Task 5.2: Custom pagination class

**Files:**
- Create: `backend/pisha_backend/pagination.py`
- Modify: `backend/pisha_backend/settings.py`

- [ ] **Step 1: Write `backend/pisha_backend/pagination.py`**

```python
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class AppPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "pageSize"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "data": data,
                "total": self.page.paginator.count,
                "page": self.page.number,
                "pageSize": self.page.paginator.per_page,
                "totalPages": self.page.paginator.num_pages,
            }
        )
```

- [ ] **Step 2: Update settings**

In `backend/pisha_backend/settings.py` replace:

```python
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
```

with:

```python
    "DEFAULT_PAGINATION_CLASS": "pisha_backend.pagination.AppPagination",
```

- [ ] **Step 3: Commit**

```bash
git add backend/pisha_backend/pagination.py backend/pisha_backend/settings.py
git commit -m "feat(backend): add app pagination matching frontend shape"
```

---

### Task 5.3: Student serializers

**Files:**
- Create: `backend/students/serializers.py`

- [ ] **Step 1: Write `backend/students/serializers.py`**

```python
from rest_framework import serializers

from .models import Activity, Attendance, Student


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            "id",
            "name",
            "initials",
            "student_id",
            "course",
            "group_name",
            "rating",
            "status",
            "total_score",
            "average_score",
        ]


class StudentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["rating", "status"]


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ["week_index", "value"]


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ["category", "name", "points"]


class StudentProfileSerializer(serializers.ModelSerializer):
    attendances = AttendanceSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    project_count = serializers.SerializerMethodField()
    attendance_pct = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = StudentSerializer.Meta.fields + [
            "attendances",
            "activities",
            "project_count",
            "attendance_pct",
        ]

    def get_project_count(self, obj: Student) -> int:
        return obj.activities.filter(category=Activity.Category.PROJECT).count()

    def get_attendance_pct(self, obj: Student) -> float:
        attendances = obj.attendances.all()
        if not attendances:
            return 0.0
        total = sum(a.value for a in attendances)
        avg = total / len(attendances)
        if avg <= 1:
            avg *= 100
        return round(min(100, avg), 1)
```

- [ ] **Step 2: Commit**

```bash
git add backend/students/serializers.py
git commit -m "feat(students): add serializers"
```

---

### Task 5.4: Student views and URLs

**Files:**
- Create: `backend/students/views.py`
- Create: `backend/students/urls.py`
- Create: `backend/students/rating_urls.py`
- Create: `backend/students/dashboard_urls.py`

- [ ] **Step 1: Write `backend/students/views.py`**

```python
from django.db.models import Avg, Max, Q
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .models import Activity, Attendance, Student
from .serializers import (
    StudentProfileSerializer,
    StudentSerializer,
    StudentUpdateSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by("-total_score", "name")
    serializer_class = StudentSerializer
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return StudentProfileSerializer
        if self.action in ["update", "partial_update"]:
            return StudentUpdateSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        qs = super().get_queryset()
        course = self.request.query_params.get("course")
        search = self.request.query_params.get("search", "").strip()
        if course:
            qs = qs.filter(course=course)
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(student_id__icontains=search)
                | Q(group_name__icontains=search)
            )
        return qs

    def get_permissions(self):
        if self.action in ["update", "partial_update"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def profile(self, request, pk=None):
        student = self.get_object()
        serializer = StudentProfileSerializer(student)
        return Response({"data": serializer.data, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rating_view(request):
    course = request.query_params.get("course")
    search = request.query_params.get("search", "").strip().lower()

    qs = Student.objects.prefetch_related("activities")
    if course:
        qs = qs.filter(course=int(course))
    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(group_name__icontains=search)
            | Q(student_id__icontains=search)
        )

    students = list(qs)
    students.sort(key=lambda s: -s.total_score)

    current_user_id = request.user.id if request.user.role == "student" else None

    result = []
    for i, student in enumerate(students):
        activity_score = round(sum(a.points for a in student.activities.all()), 1)
        prev = students[i - 1] if i > 0 else None
        diff = round(student.total_score - prev.total_score, 1) if prev else 0
        trend = "up" if diff > 0 else "down" if diff < 0 else "stable"
        is_current = current_user_id is not None and student.id == current_user_id

        result.append(
            {
                "id": str(student.id),
                "rank": i + 1,
                "name": student.name,
                "course": student.course,
                "group": student.group_name,
                "academicScore": round(student.average_score, 2),
                "activityScore": activity_score,
                "totalScore": round(student.total_score, 2),
                "trend": trend,
                "trendValue": abs(diff) if trend != "stable" else None,
                "isCurrentUser": is_current,
            }
        )

    current = next((s for s in result if s["isCurrentUser"]), None)
    avg_score = (
        round(sum(s["totalScore"] for s in result) / len(result), 1) if result else 0
    )
    avg_activity = (
        round(sum(s["activityScore"] for s in result) / len(result), 1)
        if result
        else 0
    )

    activity_level = "Средняя"
    if current:
        if current["activityScore"] > avg_activity:
            activity_level = "Высокая"
        elif current["activityScore"] < avg_activity * 0.5:
            activity_level = "Низкая"

    stats = {
        "myPlace": current["rank"] if current else 0,
        "myPlaceChange": 0,
        "topScore": result[0]["totalScore"] if result else 0,
        "averageScore": avg_score,
        "activityLevel": activity_level,
    }

    return Response({"data": {"students": result, "stats": stats}, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_metrics_view(request):
    total = Student.objects.count()
    avg_gpa = Student.objects.aggregate(avg=Avg("average_score"))["avg"] or 0

    attendance_avg = 0.0
    attendances = Attendance.objects.all()
    if attendances.exists():
        total_val = sum(a.value for a in attendances)
        avg = total_val / attendances.count()
        if avg <= 1:
            avg *= 100
        attendance_avg = round(min(100, avg), 1)

    projects = Activity.objects.filter(category=Activity.Category.PROJECT).count()

    data = {
        "totalStudents": total,
        "totalStudentsChange": 0,
        "averageGpa": round(avg_gpa, 2),
        "attendance": attendance_avg,
        "projects": projects,
        "newRequests": 0,
    }
    return Response({"data": data, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gpa_distribution_view(request):
    buckets = [
        (0, 2, "< 2.0"),
        (2, 3, "2.0–3.0"),
        (3, 3.5, "3.0–3.5"),
        (3.5, 4, "3.5–4.0"),
        (4, 4.5, "4.0–4.5"),
        (4.5, 5, "4.5–5.0"),
    ]
    counts = [0] * len(buckets)
    for student in Student.objects.all():
        for i, (lo, hi, _label) in enumerate(buckets):
            if lo <= student.average_score < hi:
                counts[i] += 1
                break

    max_count = max(counts + [1])
    data = [
        {"label": label, "value": round((count / max_count) * 100)}
        for count, (_lo, _hi, label) in zip(counts, buckets)
    ]
    return Response({"data": data, "status": 200})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_trends_view(request):
    max_week = Attendance.objects.aggregate(max_week=Max("week_index"))["max_week"]
    if max_week is None:
        return Response({"data": [], "status": 200})

    data = []
    for week in range(max_week + 1):
        values = list(
            Attendance.objects.filter(week_index=week).values_list("value", flat=True)
        )
        avg = sum(values) / len(values) if values else 0
        if avg <= 1:
            avg *= 100
        pct = round(min(100, avg), 1)
        data.append({"month": f"Нед {week + 1}", "value": pct})

    return Response({"data": data, "status": 200})
```

- [ ] **Step 2: Write URL files**

`backend/students/urls.py`:

```python
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("", views.StudentViewSet, basename="students")

urlpatterns = [
    path("", include(router.urls)),
]
```

`backend/students/rating_urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("", views.rating_view, name="rating"),
]
```

`backend/students/dashboard_urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("metrics", views.dashboard_metrics_view, name="metrics"),
    path("gpa-distribution", views.gpa_distribution_view, name="gpa-distribution"),
    path("attendance-trends", views.attendance_trends_view, name="attendance-trends"),
]
```

- [ ] **Step 3: Commit**

```bash
git add backend/students/
git commit -m "feat(students): add views, serializers and urls"
```

---

### Task 5.5: Import/Export upload view

**Files:**
- Create: `backend/import_export/views.py`
- Create: `backend/import_export/urls.py`

- [ ] **Step 1: Write `backend/import_export/views.py`**

```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .parsers import (
    has_multi_level_header,
    parse_flat_excel_buffer,
    parse_rating_excel_buffer,
)
from .services import persist_imported_data


@api_view(["POST"])
@permission_classes([IsAdminUser])
def upload_excel_view(request):
    uploaded = request.FILES.get("file")
    parser = request.data.get("parser", "auto")

    if not uploaded:
        return Response(
            {"message": "No file provided", "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    buffer = uploaded.read()

    try:
        if parser == "multi":
            parsed = parse_rating_excel_buffer(buffer)
            students = parsed.students
            events = parsed.events
        elif parser == "flat":
            students = parse_flat_excel_buffer(buffer)
            events = []
        else:
            if has_multi_level_header(buffer):
                parsed = parse_rating_excel_buffer(buffer)
                students = parsed.students
                events = parsed.events
            else:
                students = parse_flat_excel_buffer(buffer)
                events = []

        summary = persist_imported_data(students, events)
        return Response({"data": summary, "status": 200})
    except Exception as exc:
        return Response(
            {"message": str(exc), "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )
```

- [ ] **Step 2: Write `backend/import_export/urls.py`**

```python
from django.urls import path

from . import views

urlpatterns = [
    path("excel", views.upload_excel_view, name="import-excel"),
]
```

- [ ] **Step 3: Commit**

```bash
git add backend/import_export/views.py backend/import_export/urls.py
git commit -m "feat(import): add excel upload view"
```

---

### Task 5.6: Scoring API

**Files:**
- Create: `backend/scoring/serializers.py`
- Create: `backend/scoring/views.py`
- Create: `backend/scoring/urls.py`

- [ ] **Step 1: Write serializers, views and URLs**

`backend/scoring/serializers.py`:

```python
from rest_framework import serializers

from .models import ScoringLog


class ScoringLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringLog
        fields = ["id", "activity_type", "points", "participant_count", "created_at"]
```

`backend/scoring/views.py`:

```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from students.models import Student

from .models import ScoringLog, ScoringParticipant
from .serializers import ScoringLogSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scoring_logs_view(request):
    logs = ScoringLog.objects.all()[:50]
    serializer = ScoringLogSerializer(logs, many=True)
    return Response({"data": serializer.data, "status": 200})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def create_scoring_view(request):
    activity_type = request.data.get("activity_type") or request.data.get(
        "activityType", ""
    )
    points = int(request.data.get("points", 0))
    participant_count = int(
        request.data.get("participant_count") or request.data.get("participantCount", 0)
    )
    student_ids = request.data.get("studentIds") or request.data.get("student_ids", [])

    log = ScoringLog.objects.create(
        activity_type=activity_type,
        points=points,
        participant_count=participant_count,
    )

    for sid in student_ids:
        try:
            student = Student.objects.get(pk=sid)
            ScoringParticipant.objects.create(log=log, student=student)
            student.total_score += points
            student.save(update_fields=["total_score"])
        except Student.DoesNotExist:
            pass

    serializer = ScoringLogSerializer(log)
    return Response({"data": serializer.data, "status": status.HTTP_201_CREATED})
```

`backend/scoring/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("logs", views.scoring_logs_view, name="scoring-logs"),
    path("", views.create_scoring_view, name="scoring-create"),
]
```

- [ ] **Step 2: Commit**

```bash
git add backend/scoring/
git commit -m "feat(scoring): add scoring api"
```

---

### Task 5.7: Scholarships API

**Files:**
- Create: `backend/scholarships/serializers.py`
- Create: `backend/scholarships/views.py`
- Create: `backend/scholarships/urls.py`

- [ ] **Step 1: Write serializers, views and URLs**

`backend/scholarships/serializers.py`:

```python
from rest_framework import serializers

from .models import Scholarship


class ScholarshipSerializer(serializers.ModelSerializer):
    requiredScore = serializers.FloatField(source="required_score")

    class Meta:
        model = Scholarship
        fields = ["id", "title", "description", "requiredScore", "amount", "type"]
```

`backend/scholarships/views.py`:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Scholarship
from .serializers import ScholarshipSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scholarship_list_view(request):
    scholarships = Scholarship.objects.all()
    serializer = ScholarshipSerializer(scholarships, many=True)
    return Response({"data": serializer.data, "status": 200})
```

`backend/scholarships/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("", views.scholarship_list_view, name="scholarships"),
]
```

- [ ] **Step 2: Commit**

```bash
git add backend/scholarships/
git commit -m "feat(scholarships): add scholarship api"
```

---

### Task 5.8: Notifications API

**Files:**
- Create: `backend/notifications/serializers.py`
- Create: `backend/notifications/views.py`
- Create: `backend/notifications/urls.py`

- [ ] **Step 1: Write serializers, views and URLs**

`backend/notifications/serializers.py`:

```python
from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "type", "read", "created_at"]
```

`backend/notifications/views.py`:

```python
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list_view(request):
    notifications = Notification.objects.all()
    serializer = NotificationSerializer(notifications, many=True)
    return Response({"data": serializer.data, "status": 200})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_read_view(request, pk):
    notification = get_object_or_404(Notification, pk=pk)
    notification.read = True
    notification.save(update_fields=["read"])
    return Response({"data": NotificationSerializer(notification).data, "status": 200})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read_view(request):
    Notification.objects.update(read=True)
    return Response({"data": None, "status": 200})
```

`backend/notifications/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("", views.notification_list_view, name="notifications"),
    path("<str:pk>/read", views.mark_read_view, name="mark-read"),
    path("mark-all-read", views.mark_all_read_view, name="mark-all-read"),
]
```

- [ ] **Step 2: Commit**

```bash
git add backend/notifications/
git commit -m "feat(notifications): add notification api"
```

---

### Task 5.9: AI rules API

**Files:**
- Create: `backend/ai_rules/serializers.py`
- Create: `backend/ai_rules/views.py`
- Create: `backend/ai_rules/urls.py`

- [ ] **Step 1: Write serializers, views and URLs**

`backend/ai_rules/serializers.py`:

```python
from rest_framework import serializers

from .models import AIRule


class AIRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRule
        fields = ["id", "conditions", "actions", "is_active", "created_at"]
```

`backend/ai_rules/views.py`:

```python
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIRule
from .serializers import AIRuleSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def ai_rule_list_create_view(request):
    if request.method == "GET":
        rules = AIRule.objects.all()
        serializer = AIRuleSerializer(rules, many=True)
        return Response({"data": serializer.data, "status": 200})

    serializer = AIRuleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({"data": serializer.data, "status": status.HTTP_201_CREATED})


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def ai_rule_detail_view(request, pk):
    rule = get_object_or_404(AIRule, pk=pk)

    if request.method == "GET":
        return Response({"data": AIRuleSerializer(rule).data, "status": 200})

    if request.method == "DELETE":
        rule.delete()
        return Response({"data": None, "status": status.HTTP_204_NO_CONTENT})

    serializer = AIRuleSerializer(rule, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({"data": serializer.data, "status": 200})
```

`backend/ai_rules/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("", views.ai_rule_list_create_view, name="ai-rules"),
    path("<str:pk>", views.ai_rule_detail_view, name="ai-rule-detail"),
]
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai_rules/
git commit -m "feat(ai_rules): add ai rules crud api"
```

---

### Task 5.10: Server metrics API

**Files:**
- Create: `backend/server/views.py`
- Create: `backend/server/urls.py`

- [ ] **Step 1: Write views and URLs**

`backend/server/views.py`:

```python
import random

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def server_metrics_view(request):
    data = {
        "cpuLoad": round(random.uniform(20, 60), 1),
        "ramUsage": round(random.uniform(30, 70), 1),
        "gpuUsage": round(random.uniform(10, 40), 1),
        "status": "online",
        "location": "Yekaterinburg",
    }
    return Response({"data": data, "status": 200})
```

`backend/server/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("metrics", views.server_metrics_view, name="server-metrics"),
]
```

- [ ] **Step 2: Commit**

```bash
git add backend/server/views.py backend/server/urls.py
git commit -m "feat(server): add mock server metrics endpoint"
```

---

### Task 5.11: Seed database command

**Files:**
- Create: `backend/server/management/__init__.py`
- Create: `backend/server/management/commands/__init__.py`
- Create: `backend/server/management/commands/seed_database.py`

- [ ] **Step 1: Create command**

`backend/server/management/__init__.py`: empty.
`backend/server/management/commands/__init__.py`: empty.

`backend/server/management/commands/seed_database.py`:

```python
from django.core.management import call_command
from django.core.management.base import BaseCommand

from notifications.models import Notification
from scholarships.models import Scholarship


class Command(BaseCommand):
    help = "Seed database with default data"

    def handle(self, *args, **options):
        call_command("seed_admin")

        scholarships = [
            Scholarship(
                title="Академическая стипендия",
                description="Базовая академическая стипендия для студентов с хорошей успеваемостью.",
                required_score=12,
                amount=3500,
                type=Scholarship.Type.ACADEMIC,
            ),
            Scholarship(
                title="Повышенная академическая",
                description="Повышенная стипендия для студентов с отличными результатами.",
                required_score=16,
                amount=8500,
                type=Scholarship.Type.ENHANCED,
            ),
            Scholarship(
                title="Стипендия за достижения",
                description="Стипендия за выдающиеся достижения в научной, проектной или общественной деятельности.",
                required_score=20,
                amount=15000,
                type=Scholarship.Type.ACHIEVEMENT,
            ),
        ]
        for scholarship in scholarships:
            Scholarship.objects.get_or_create(
                title=scholarship.title,
                defaults={
                    "description": scholarship.description,
                    "required_score": scholarship.required_score,
                    "amount": scholarship.amount,
                    "type": scholarship.type,
                },
            )

        notifications = [
            Notification(
                title="Система запущена",
                message="Бэкенд успешно подключён к базе данных.",
                type=Notification.Type.SUCCESS,
            ),
            Notification(
                title="Загрузите рейтинг",
                message="Для начала работы импортируйте Excel-файл на странице рейтинга.",
                type=Notification.Type.INFO,
            ),
        ]
        for notification in notifications:
            Notification.objects.get_or_create(
                title=notification.title,
                defaults={
                    "message": notification.message,
                    "type": notification.type,
                },
            )

        self.stdout.write(self.style.SUCCESS("Database seeded"))
```

- [ ] **Step 2: Commit**

```bash
git add backend/server/management/
git commit -m "feat(server): add seed_database management command"
```

---

### Task 5.12: Run migrations and verify endpoints locally

**Files:** none

- [ ] **Step 1: Make and apply migrations**

```bash
cd backend
source .venv/bin/activate
python manage.py makemigrations
python manage.py migrate
python manage.py seed_database
```

Expected: no errors; admin and scholarships created.

- [ ] **Step 2: Start backend**

```bash
python manage.py runserver
```

- [ ] **Step 3: Smoke-test login**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"groupName":"admin","password":"1234"}'
```

Expected: JSON with `data.token` and `data.user.role == "admin"`.

- [ ] **Step 4: Commit migrations**

```bash
git add backend/*/migrations/
git commit -m "chore: add api migrations"
```

---

### Task 5.13: Backend smoke tests

**Files:**
- Create: `backend/students/tests.py`
- Create: `backend/import_export/tests.py`

- [ ] **Step 1: Write tests**

`backend/students/tests.py`:

```python
from django.test import TestCase

from students.models import Student


class StudentModelTests(TestCase):
    def test_create_student(self):
        student = Student.objects.create(
            name="Иван Петров",
            initials="ИП",
            student_id="ИНБО-001",
            course=3,
            group_name="ИНБО-01",
            total_score=100,
            average_score=4.5,
        )
        self.assertEqual(student.status, Student.Status.ACTIVE)
        self.assertEqual(str(student), "Иван Петров")
```

`backend/import_export/tests.py`:

```python
import io

from django.test import TestCase
from openpyxl import Workbook

from import_export.parsers import parse_flat_excel_buffer


class ParserTests(TestCase):
    def test_flat_parser_reads_student(self):
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.append(
            ["Студент", "Группа", "Курс", "Баллы (учеба)", "Баллы (активность)", "Общий балл"]
        )
        worksheet.append(["Иван Петров", "ИНБО-01", 3, 4, 1, 5])

        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)

        result = parse_flat_excel_buffer(buffer.read())
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].full_name, "Иван Петров")
        self.assertEqual(result[0].group_name, "ИНБО-01")
```

- [ ] **Step 2: Run tests**

```bash
cd backend
source .venv/bin/activate
python manage.py test
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/students/tests.py backend/import_export/tests.py
git commit -m "test(backend): add smoke tests for students and parser"
```

---

## Phase 6: Docker verification

### Task 6.1: Build and run the full stack

**Files:** none

- [ ] **Step 1: Start services**

```bash
docker compose down -v
docker compose up --build -d
```

Expected: three containers `pisha-db`, `pisha-backend`, `pisha-frontend` start.

- [ ] **Step 2: Wait for backend migrations**

```bash
docker logs -f pisha-backend
```

Expected output contains `Database seeded` and Gunicorn listening on `0.0.0.0:8000`.

- [ ] **Step 3: Test login through frontend nginx**

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"groupName":"admin","password":"1234"}'
```

Expected: token and admin user.

- [ ] **Step 4: Test an authenticated endpoint**

```bash
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"groupName":"admin","password":"1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

curl -H "Authorization: Bearer $TOKEN" http://localhost/api/dashboard/metrics
```

Expected: JSON with dashboard metrics.

- [ ] **Step 5: Stop services**

```bash
docker compose down
```

No commit; this is verification.

---

## Scope coverage

- **Django project + PostgreSQL:** Tasks 1.1–1.5.
- **Docker orchestration + frontend move:** Tasks 1.6–1.11.
- **Models:** Tasks 2.1–2.5.
- **JWT auth + default admin:** Tasks 3.1–3.2.
- **Excel parsing in backend:** Tasks 4.1–4.3.
- **REST API:** Tasks 5.1–5.13.
- **E2E Docker smoke test:** Task 6.1.

## Placeholder scan

No `TBD`, `TODO`, `implement later`, or vague "add validation" steps remain. Every task shows exact file paths, code, commands, and expected output.

## Type consistency notes

- Student IDs are UUIDs on the backend and strings in the frontend.
- `Student.status` values are `"active"`, `"at_risk"`, `"top_reserve"`, `"expelled"` in both backend model and frontend union type.
- `PaginatedResponse` shape (`data`, `total`, `page`, `pageSize`, `totalPages`) is produced by `AppPagination` and consumed by frontend `useStudents`.
- `RatingStudent` fields `academicScore`, `activityScore`, `totalScore`, `isCurrentUser` are produced by `rating_view` and match `frontend/src/types/domain.ts`.
- `ScholarshipOffer.requiredScore` maps to backend `Scholarship.required_score` via `ScholarshipSerializer`.

## Out of scope

- AI execution/engine logic. Only `AIRule` CRUD storage is implemented here; the smart assistant will be planned separately.
- Real-time server metrics. `server/metrics` returns randomized values.
- Password change/profile edit endpoints. The frontend profile page keeps local password validation for now.
- Production hardening: HTTPS, S3/static CDN, backups, monitoring.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-11-backend-for-pisha.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — run tasks in this session using `superpowers:executing-plans`.

Frontend integration is covered in a separate plan: `docs/superpowers/plans/2026-07-11-frontend-integration-for-pisha.md`.
