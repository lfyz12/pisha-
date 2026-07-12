from django.urls import path

from . import views

urlpatterns = [
    path("", views.ai_rule_list_create_view, name="ai-rules"),
    path("<str:pk>", views.ai_rule_detail_view, name="ai-rule-detail"),
]
