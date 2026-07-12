from django.core.management import call_command
from django.core.management.base import BaseCommand

from notifications.models import Notification
from scholarships.models import Scholarship


class Command(BaseCommand):
    help = "Seed database with default data"

    def handle(self, *args, **options):
        call_command("seed_admin")

        scholarships = [
            Scholarship(
                title="Академическая стипендия",
                description="Базовая академическая стипендия для студентов с хорошей успеваемостью.",
                required_score=12,
                amount=3500,
                type=Scholarship.Type.ACADEMIC,
            ),
            Scholarship(
                title="Повышенная академическая",
                description="Повышенная стипендия для студентов с отличными результатами.",
                required_score=16,
                amount=8500,
                type=Scholarship.Type.ENHANCED,
            ),
            Scholarship(
                title="Стипендия за достижения",
                description="Стипендия за выдающиеся достижения в научной, проектной или общественной деятельности.",
                required_score=20,
                amount=15000,
                type=Scholarship.Type.ACHIEVEMENT,
            ),
        ]
        for scholarship in scholarships:
            Scholarship.objects.get_or_create(
                title=scholarship.title,
                defaults={
                    "description": scholarship.description,
                    "required_score": scholarship.required_score,
                    "amount": scholarship.amount,
                    "type": scholarship.type,
                },
            )

        notifications = [
            Notification(
                title="Система запущена",
                message="Бэкенд успешно подключён к базе данных.",
                type=Notification.Type.SUCCESS,
            ),
            Notification(
                title="Загрузите рейтинг",
                message="Для начала работы импортируйте Excel-файл на странице рейтинга.",
                type=Notification.Type.INFO,
            ),
        ]
        for notification in notifications:
            Notification.objects.get_or_create(
                title=notification.title,
                defaults={
                    "message": notification.message,
                    "type": notification.type,
                },
            )

        self.stdout.write(self.style.SUCCESS("Database seeded"))
