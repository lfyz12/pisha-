from django.test import TestCase
from rest_framework.test import APIClient

from students.models import Student
from users.models import User


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


class ProfilePrivacyTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="secret", role=User.Role.STUDENT)
        self.other_user = User.objects.create_user(username="other", password="secret", role=User.Role.STUDENT)
        self.owner_student = Student.objects.create(id=self.owner.id, name="Owner Student", initials="OS", student_id="O-1", course=1, group_name="G")
        self.other_student = Student.objects.create(id=self.other_user.id, name="Other Student", initials="SS", student_id="S-1", course=1, group_name="G")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_student_cannot_read_another_profile_by_default(self):
        response = self.client.get(f"/api/students/{self.other_student.id}/", secure=True)
        self.assertEqual(response.status_code, 404)

    def test_rating_hides_names_by_default(self):
        response = self.client.get("/api/rating/", secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Other Student", [item["name"] for item in response.data["data"]["students"]])
