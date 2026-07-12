import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create default admin user if it does not exist"

    def handle(self, *args, **options):
        if not User.objects.filter(username="admin").exists():
            password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "1234")
            User.objects.create_superuser(
                username="admin",
                password=password,
                role=User.Role.ADMIN,
                group_name="admin",
                first_name="Администратор",
            )
            self.stdout.write(self.style.SUCCESS("Default admin created"))
        else:
            self.stdout.write("Default admin already exists")
