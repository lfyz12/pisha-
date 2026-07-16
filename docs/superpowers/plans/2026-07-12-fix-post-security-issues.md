# Fix Post-Security Review Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five small correctness/consistency issues discovered after the security hardening update: recovery-code uniqueness, dead `Notification.read` field, inconsistent notification URL trailing slashes, misaligned backend `.env.example`, and the stub forgot-password page.

**Architecture:** Each fix is isolated and touches only the files it needs. Model changes are delivered through Django migrations so existing databases keep working. The forgot-password endpoint is intentionally a safe no-op that logs the request without exposing account existence or performing an actual reset (the project has no email gateway yet).

**Tech Stack:** Django 5, Django REST Framework, pyotp, cryptography, React + TypeScript + axios.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `backend/users/models.py` | `RecoveryCode` model: per-user unique constraint instead of global unique. |
| `backend/users/mfa.py` | Longer recovery codes (16 hex chars) for more entropy. |
| `backend/users/tests.py` | New tests for recovery-code length and per-user uniqueness. |
| `backend/notifications/models.py` | Remove dead `read` BooleanField. |
| `backend/notifications/serializers.py` | Keep computed `read` field, no DB field dependency. |
| `backend/notifications/urls.py` | Add trailing slashes to routes. |
| `frontend/src/services/notification.ts` | Add trailing slashes to match Django routes. |
| `backend/.env.example` | Replace `DATABASE_URL` with the `POSTGRES_*` variables `settings.py` actually reads. |
| `backend/users/serializers.py` | Minimal serializer for forgot-password request. |
| `backend/users/views.py` | `forgot_password_view`: validate, audit, return generic response. |
| `backend/users/urls.py` | Wire `password/forgot/` route. |
| `frontend/src/services/security.ts` | Add `requestPasswordReset` call. |
| `frontend/src/pages/auth/forgot-password/index.tsx` | Call backend instead of only toggling local state. |

---

## Task 1: Recovery codes — per-user uniqueness and more entropy

### Task 1.1: Update the `RecoveryCode` model

**Files:**
- Modify: `backend/users/models.py`

- [ ] **Step 1: Replace the `RecoveryCode` class**

```python
class RecoveryCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recovery_codes")
    code_hash = models.CharField(max_length=128)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "code_hash"], name="unique_recovery_code_per_user")
        ]
```

- [ ] **Step 2: Generate the migration**

Run:

```bash
cd /root/pisha-/backend
source .venv/bin/activate
python manage.py makemigrations users
```

Expected: `backend/users/migrations/0003_alter_recoverycode_code_hash_and_more.py` (or similar) created.

- [ ] **Step 3: Commit**

```bash
git add backend/users/models.py backend/users/migrations/
git commit -m "fix(users): make recovery codes unique per user instead of globally"
```

### Task 1.2: Increase recovery-code entropy

**Files:**
- Modify: `backend/users/mfa.py`

- [ ] **Step 1: Change token length**

In `create_recovery_codes`, replace:

```python
    codes = [secrets.token_hex(4).upper() for _ in range(count)]
```

with:

```python
    codes = [secrets.token_hex(8).upper() for _ in range(count)]
```

- [ ] **Step 2: Commit**

```bash
git add backend/users/mfa.py
git commit -m "fix(users): increase recovery code entropy"
```

### Task 1.3: Add recovery-code tests

**Files:**
- Modify: `backend/users/tests.py`

- [ ] **Step 1: Append tests**

Add to the end of `backend/users/tests.py`:

```python
from django.db import IntegrityError

from users.mfa import create_recovery_codes


class RecoveryCodeTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="user-a", password="pass", role=User.Role.STUDENT)
        self.user_b = User.objects.create_user(username="user-b", password="pass", role=User.Role.STUDENT)

    def test_recovery_codes_are_16_chars(self):
        codes = create_recovery_codes(self.user_a, count=1)
        self.assertEqual(len(codes[0]), 16)

    def test_same_code_hash_for_different_users_is_allowed(self):
        # Force the same raw code for both users by monkey-patching secrets.token_hex
        fixed_code = "A" * 16
        import secrets as _secrets
        original = _secrets.token_hex
        _secrets.token_hex = lambda _n: fixed_code
        try:
            create_recovery_codes(self.user_a, count=1)
            create_recovery_codes(self.user_b, count=1)
        finally:
            _secrets.token_hex = original
        self.assertEqual(self.user_a.recovery_codes.count(), 1)
        self.assertEqual(self.user_b.recovery_codes.count(), 1)

    def test_duplicate_code_for_same_user_is_rejected(self):
        fixed_code = "B" * 16
        import secrets as _secrets
        original = _secrets.token_hex
        _secrets.token_hex = lambda _n: fixed_code
        try:
            create_recovery_codes(self.user_a, count=1)
            with self.assertRaises(IntegrityError):
                create_recovery_codes(self.user_a, count=1)
        finally:
            _secrets.token_hex = original
```

- [ ] **Step 2: Run syntax check**

```bash
python -m py_compile backend/users/tests.py
python manage.py check
```

Expected: no syntax errors, `System check identified no issues`.

- [ ] **Step 3: Commit**

```bash
git add backend/users/tests.py
git commit -m "test(users): add recovery code uniqueness and length tests"
```

---

## Task 2: Remove dead `Notification.read` field

**Files:**
- Modify: `backend/notifications/models.py`
- Modify: `backend/notifications/serializers.py`
- Create: migration file (generated)

- [ ] **Step 1: Remove the field from the model**

In `backend/notifications/models.py`, change the `Notification` class to:

```python
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
```

- [ ] **Step 2: Verify serializer still uses `NotificationRead`**

`backend/notifications/serializers.py` should remain exactly as currently written:

```python
from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "title", "message", "type", "read", "created_at"]

    def get_read(self, notification):
        read_ids = self.context.get("read_ids", set())
        return str(notification.id) in read_ids
```

No changes are needed here; the computed `read` field is the correct source of truth.

- [ ] **Step 3: Generate the migration**

```bash
cd /root/pisha-/backend
source .venv/bin/activate
python manage.py makemigrations notifications
```

Expected: `backend/notifications/migrations/0003_remove_notification_read.py` (or similar) created.

- [ ] **Step 4: Commit**

```bash
git add backend/notifications/models.py backend/notifications/migrations/
git commit -m "fix(notifications): remove dead read boolean field"
```

---

## Task 3: Add trailing slashes to notification routes

### Task 3.1: Update backend URLs

**Files:**
- Modify: `backend/notifications/urls.py`

- [ ] **Step 1: Replace contents**

```python
from django.urls import path

from . import views

urlpatterns = [
    path("", views.notification_list_view, name="notifications"),
    path("<str:pk>/read/", views.mark_read_view, name="mark-read"),
    path("mark-all-read/", views.mark_all_read_view, name="mark-all-read"),
]
```

- [ ] **Step 2: Commit**

```bash
git add backend/notifications/urls.py
git commit -m "fix(notifications): add trailing slashes to url routes"
```

### Task 3.2: Update frontend service URLs

**Files:**
- Modify: `frontend/src/services/notification.ts`

- [ ] **Step 1: Replace contents**

```typescript
import type { ApiResponse } from "@/types";
import type { Notification } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function fetchNotifications(): Promise<ApiResponse<Notification[]>> {
  const { data } = await apiClient.get<ApiResponse<Notification[]>>("/notifications/");
  return data;
}

export async function markAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
  const { data } = await apiClient.patch<ApiResponse<Notification>>(
    `/notifications/${notificationId}/read/`
  );
  return data;
}

export async function markAllAsRead(): Promise<ApiResponse<null>> {
  const { data } = await apiClient.post<ApiResponse<null>>("/notifications/mark-all-read/");
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/notification.ts
git commit -m "fix(services): add trailing slashes to notification api calls"
```

---

## Task 4: Align `backend/.env.example` with `settings.py`

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Replace contents**

```text
SECRET_KEY=replace-with-a-long-random-secret
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
POSTGRES_DB=pisha_db
POSTGRES_USER=pisha
POSTGRES_PASSWORD=pisha_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost
DEFAULT_ADMIN_PASSWORD=replace-with-a-strong-admin-password
FIELD_ENCRYPTION_KEY=replace-with-a-fernet-key-from-cryptography.fernet.Fernet.generate_key
```

- [ ] **Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "docs(env): align backend env example with settings.py variables"
```

---

## Task 5: Wire forgot-password page to a safe backend endpoint

### Task 5.1: Add forgot-password serializer

**Files:**
- Create: `backend/users/serializers.py`

- [ ] **Step 1: Write the file**

```python
from rest_framework import serializers


class ForgotPasswordSerializer(serializers.Serializer):
    groupName = serializers.CharField(required=True, max_length=150)
```

- [ ] **Step 2: Commit**

```bash
git add backend/users/serializers.py
git commit -m "feat(auth): add forgot password request serializer"
```

### Task 5.2: Add forgot-password view

**Files:**
- Modify: `backend/users/views.py`

- [ ] **Step 1: Add imports**

Ensure the top of `backend/users/views.py` includes:

```python
from rest_framework.permissions import AllowAny

from security.models import audit_event

from .serializers import ForgotPasswordSerializer
```

(Keep the existing imports; add these three lines.)

- [ ] **Step 2: Append the view function**

Add at the bottom of `backend/users/views.py`:

```python
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
```

- [ ] **Step 3: Wire the URL**

In `backend/users/urls.py`, add the route inside `urlpatterns`:

```python
    path("password/forgot/", views.forgot_password_view, name="forgot-password"),
```

- [ ] **Step 4: Commit**

```bash
git add backend/users/views.py backend/users/urls.py
git commit -m "feat(auth): add safe forgot password endpoint"
```

### Task 5.3: Add frontend service call

**Files:**
- Modify: `frontend/src/services/security.ts`

- [ ] **Step 1: Append function**

Add at the end of `frontend/src/services/security.ts`:

```typescript
export async function requestPasswordReset(groupName: string): Promise<ApiResponse<{ message: string }>> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>("/auth/password/forgot/", {
    groupName,
  });
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/security.ts
git commit -m "feat(services): add requestPasswordReset helper"
```

### Task 5.4: Update forgot-password page

**Files:**
- Modify: `frontend/src/pages/auth/forgot-password/index.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/ui/icon";
import { requestPasswordReset } from "@/services/security";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError("Не удалось отправить запрос. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start sm:items-center justify-center bg-background px-4 py-8 sm:py-0 overflow-y-auto">
      <div className="w-full max-w-[36rem] mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="lock_reset" fill className="text-on-primary text-3xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-text-main">Восстановление пароля</h1>
          <p className="text-sm sm:text-base text-secondary mt-1">Введите логин, чтобы запросить сброс пароля</p>
        </div>

        <div className="bg-surface-card p-8 sm:p-10 rounded-2xl border border-border-subtle shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-status-success/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="check_circle" fill className="text-status-success text-3xl" />
              </div>
              <p className="text-base text-text-main">
                Запрос на сброс пароля отправлен. Если учётная запись существует, вы получите инструкции.
              </p>
              <Link
                to="/auth/login"
                className="inline-block text-sm text-primary font-semibold hover:underline"
              >
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-status-error/10 border border-status-error/30 text-status-error text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-label text-secondary font-semibold">Логин / группа</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Номер студенческого или admin"
                  className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-5 py-4 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl text-base hover:opacity-90 active:scale-[0.99] transition-all text-lg disabled:opacity-50"
              >
                {isLoading ? "Отправка..." : "Отправить"}
              </button>
              <div className="text-center">
                <Link
                  to="/auth/login"
                  className="text-sm text-secondary hover:text-primary transition-colors underline"
                >
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/auth/forgot-password/index.tsx
git commit -m "feat(auth): wire forgot password page to backend endpoint"
```

---

## Task 6: Document default admin credentials

**Files:**
- Modify: `backend/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add credential comment to `backend/.env.example`**

Replace the `DEFAULT_ADMIN_PASSWORD` line with:

```text
# Default admin account created by `python manage.py seed_admin` or `seed_database`.
# Username: admin
DEFAULT_ADMIN_PASSWORD=replace-with-a-strong-admin-password
```

- [ ] **Step 2: Add admin credentials section to `README.md`**

Add a new section right after the paragraph that mentions TOTP and temporary student passwords (around line 15). Insert:

```markdown
### Учётные данные администратора по умолчанию

После запуска и сидирования базы данных создаётся администратор:

- **Логин:** `admin`
- **Пароль:** значение переменной окружения `DEFAULT_ADMIN_PASSWORD` (по умолчанию `1234` в dev-окружении, обязательно смените в production).

При первом входе администратору будет предложено настроить MFA (TOTP).
```

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example README.md
git commit -m "docs: document default admin username and password"
```

---

## Task 7: Final verification

**Files:** none

- [ ] **Step 1: Backend checks**

```bash
cd /root/pisha-/backend
source .venv/bin/activate
python manage.py check
python manage.py makemigrations --check --dry-run
```

Expected:
- `System check identified no issues (0 silenced).`
- `No changes detected`.

- [ ] **Step 2: Frontend checks**

```bash
cd /root/pisha-/frontend
npm run typecheck
npm run lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Commit any final fixes and report status**

```bash
git status
```

Expected: working tree clean.

---

## Scope coverage

| Issue | Task |
|-------|------|
| Recovery codes globally unique → collision risk | Task 1 |
| Recovery codes only 8 hex chars of entropy | Task 1.2 |
| Dead `Notification.read` DB field | Task 2 |
| Notification URLs without trailing slashes | Task 3 |
| `backend/.env.example` has unused `DATABASE_URL` | Task 4 |
| Forgot-password page is a UI stub | Task 5 |
| Default admin credentials not documented | Task 6 |

## Placeholder scan

No `TBD`, `TODO`, or vague instructions remain. Every step includes exact file paths, code blocks, commands, and expected output.

## Type consistency notes

- `requestPasswordReset` accepts `groupName: string` and sends it as `"groupName"` to match `ForgotPasswordSerializer`.
- The computed `read` field in `NotificationSerializer` stays unchanged; only the unused Boolean DB column is removed.
- `RecoveryCode.code_hash` loses `unique=True` and gains a per-user `UniqueConstraint`.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-12-fix-post-security-issues.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
