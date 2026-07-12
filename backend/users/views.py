from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def make_token_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "data": {
            "token": str(refresh.access_token),
            "user": {
                "id": str(user.id),
                "name": user.get_full_name() or user.username,
                "initials": _initials(user.get_full_name() or user.username),
                "groupName": user.group_name,
                "role": user.role,
            },
        },
        "status": 200,
    }


def _initials(name: str) -> str:
    parts = name.split()
    return "".join(p[0] for p in parts[:2]).upper()


def _find_user(login: str):
    if login.lower() == "admin":
        return User.objects.filter(role=User.Role.ADMIN).first()
    try:
        from students.models import Student

        student = Student.objects.get(student_id__iexact=login)
        return User.objects.filter(id=student.id).first()
    except Student.DoesNotExist:
        return None


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    login = request.data.get("groupName", "").strip()
    password = request.data.get("password", "")

    if not login or not password:
        return Response(
            {"message": "groupName and password are required", "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = _find_user(login)
    if user is None or not user.check_password(password):
        return Response(
            {"message": "Invalid credentials", "status": 401},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response(make_token_response(user))
