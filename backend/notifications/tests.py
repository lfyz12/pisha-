from django.test import TestCase
from rest_framework.test import APIClient

from notifications.models import Notification, NotificationRead
from users.models import User


class NotificationReadTests(TestCase):
    def test_read_state_is_per_user(self):
        first = User.objects.create_user(username="first", password="secret")
        second = User.objects.create_user(username="second", password="secret")
        notification = Notification.objects.create(title="Notice", message="Message", type="info")
        client = APIClient()
        client.force_authenticate(first)
        response = client.patch(f"/api/notifications/{notification.id}/read/", secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(NotificationRead.objects.filter(notification=notification, user=first).exists())
        self.assertFalse(NotificationRead.objects.filter(notification=notification, user=second).exists())
