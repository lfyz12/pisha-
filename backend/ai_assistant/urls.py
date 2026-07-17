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
    path("chat/sessions/", views.chat_session_list_create_view, name="chat-sessions"),
    path(
        "chat/sessions/<uuid:pk>/",
        views.chat_session_delete_view,
        name="chat-session-detail",
    ),
    path(
        "chat/sessions/<uuid:pk>/messages/",
        views.chat_message_list_view,
        name="chat-messages",
    ),
    path(
        "chat/sessions/<uuid:pk>/messages/stream/",
        views.chat_stream_view,
        name="chat-stream",
    ),
]
