from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf_view, name="csrf"),
    path("login/", views.login_view, name="login"),
    path("refresh/", views.refresh_view, name="refresh"),
    path("logout/", views.logout_view, name="logout"),
    path("password/change/", views.change_password_view, name="change-password"),
    path("password/forgot/", views.forgot_password_view, name="forgot-password"),
    path("mfa/setup/", views.mfa_setup_view, name="mfa-setup"),
    path("mfa/confirm/", views.mfa_confirm_view, name="mfa-confirm"),
    path("mfa/recovery/", views.mfa_recovery_view, name="mfa-recovery"),
]
