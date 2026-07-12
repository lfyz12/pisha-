from django.urls import path

from . import views

urlpatterns = [
    path("excel", views.upload_excel_view, name="import-excel"),
]
