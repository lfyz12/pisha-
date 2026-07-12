from django.urls import path

from . import views

urlpatterns = [
    path("", views.notification_list_view, name="notifications"),
    path("<str:pk>/read", views.mark_read_view, name="mark-read"),
    path("mark-all-read", views.mark_all_read_view, name="mark-all-read"),
]
