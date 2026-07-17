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
    path("api/ai/", include("ai_assistant.urls")),
    path("api/server/", include("server.urls")),
    path("api/security/", include("security.urls")),
]
