from django.test import TestCase

from users.views import _initials


class AuthHelperTests(TestCase):
    databases = []

    def test_initials(self):
        self.assertEqual(_initials("Иван Петров"), "ИП")
        self.assertEqual(_initials("Anna"), "A")
        self.assertEqual(_initials(""), "")
