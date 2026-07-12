from django.urls import path

from . import views

urlpatterns = [
    path("metrics", views.dashboard_metrics_view, name="metrics"),
    path("gpa-distribution", views.gpa_distribution_view, name="gpa-distribution"),
    path("attendance-trends", views.attendance_trends_view, name="attendance-trends"),
]
