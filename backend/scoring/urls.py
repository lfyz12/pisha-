from django.urls import path

from . import views

urlpatterns = [
    path("logs", views.scoring_logs_view, name="scoring-logs"),
    path("", views.create_scoring_view, name="scoring-create"),
]
