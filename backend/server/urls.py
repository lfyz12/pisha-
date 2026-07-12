from django.urls import path

from . import views

urlpatterns = [
    path("metrics", views.server_metrics_view, name="server-metrics"),
]
