import hmac

from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate same-origin API calls with the HttpOnly access-token cookie."""

    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = self.get_raw_token(header) if header is not None else None
        from_cookie = raw_token is None
        if raw_token is None:
            raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            return None

        if from_cookie and request.method not in ("GET", "HEAD", "OPTIONS"):
            csrf_cookie = request.COOKIES.get("csrftoken", "")
            csrf_header = request.headers.get("X-CSRFToken", "")
            if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
                raise exceptions.PermissionDenied("CSRF validation failed")

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
