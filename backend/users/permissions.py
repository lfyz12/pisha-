from rest_framework.permissions import BasePermission


class FullyAuthenticated(BasePermission):
    message = "Complete the required account security steps."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.password_change_required:
            return False
        if user.role == "admin":
            device = getattr(user, "mfa_device", None)
            return bool(device and device.confirmed_at)
        return True


class AdminFullyAuthenticated(FullyAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            getattr(request.user, "role", None) == "admin" or request.user.is_staff
        )
