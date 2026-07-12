from django.urls import path

from . import views

urlpatterns = [
    path("", views.scholarship_list_view, name="scholarships"),
]
