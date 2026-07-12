from django.test import TestCase

from students.models import Student


class StudentModelTests(TestCase):
    def test_create_student(self):
        student = Student.objects.create(
            name="Иван Петров",
            initials="ИП",
            student_id="ИНБО-001",
            course=3,
            group_name="ИНБО-01",
            total_score=100,
            average_score=4.5,
        )
        self.assertEqual(student.status, Student.Status.ACTIVE)
        self.assertEqual(str(student), "Иван Петров")
