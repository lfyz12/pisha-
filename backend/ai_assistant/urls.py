from django.urls import path

from . import views

app_name = "ai_assistant"

urlpatterns = [
    path("kb/documents/", views.kb_document_list_create_view, name="kb-documents"),
    path(
        "kb/documents/<uuid:pk>/",
        views.kb_document_detail_view,
        name="kb-document-detail",
    ),
    path(
        "kb/documents/<uuid:pk>/reingest/",
        views.kb_document_reingest_view,
        name="kb-document-reingest",
    ),
    path("kb/categories/", views.kb_category_list_create_view, name="kb-categories"),
    path(
        "kb/categories/<uuid:pk>/",
        views.kb_category_detail_view,
        name="kb-category-detail",
    ),
    path("projects/", views.project_list_create_view, name="projects"),
    path("projects/<uuid:pk>/", views.project_detail_view, name="project-detail"),
]
