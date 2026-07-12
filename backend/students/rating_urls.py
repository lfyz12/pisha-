from django.urls import path

from . import views

urlpatterns = [
    path("", views.rating_view, name="rating"),
]
