"""Tests for the student service layer and view compatibility."""

from django.test import TestCase
from rest_framework.test import APIClient

from students.models import Activity, Attendance, Event, Student
from students.services import (
    get_attendance_trends,
    get_dashboard_metrics,
    get_gpa_distribution,
    get_rating_analytics,
    get_student_activities,
    get_student_rating,
)
from users.models import User


def _make_student_user(username, **student_kwargs):
    user = User.objects.create_user(
        username=username, password="secret", role=User.Role.STUDENT
    )
    defaults = {
        "id": user.id,
        "name": f"{username} name",
        "initials": "SN",
        "student_id": username,
        "course": 1,
        "group_name": "G-1",
    }
    defaults.update(student_kwargs)
    student = Student.objects.create(**defaults)
    return user, student


class StudentServicesTests(TestCase):
    def setUp(self):
        self.user, self.student = _make_student_user(
            "svc-student", total_score=150, average_score=4.2
        )
        self.other_user, self.other_student = _make_student_user(
            "svc-other", total_score=120, average_score=3.8
        )
        Activity.objects.create(
            student=self.student, category=Activity.Category.SCIENCE, name="Conf", points=10
        )
        Activity.objects.create(
            student=self.student,
            category=Activity.Category.PROJECT,
            name="Project",
            points=20,
        )
        Attendance.objects.create(student=self.student, week_index=0, value=0.9)
        Attendance.objects.create(student=self.other_student, week_index=0, value=0.8)

    def test_get_student_rating_keys(self):
        rating = get_student_rating(self.user)
        self.assertEqual(rating["rank"], 1)
        self.assertEqual(rating["total_score"], 150)
        self.assertEqual(rating["academic_score"], 4.2)
        self.assertEqual(rating["activity_score"], 30)
        self.assertEqual(rating["my_place"], rating["rank"])
        self.assertGreaterEqual(rating["top_score"], rating["total_score"])
        self.assertIn(rating["trend"], {"up", "down", "stable"})
        self.assertIn(
            rating["activity_level"], {"Высокая", "Средняя", "Низкая"}
        )

    def test_get_dashboard_metrics(self):
        metrics = get_dashboard_metrics()
        self.assertIn("totalStudents", metrics)
        self.assertIn("averageGpa", metrics)
        self.assertIn("attendance", metrics)
        self.assertIn("projects", metrics)
        self.assertEqual(metrics["totalStudents"], 2)
        self.assertEqual(metrics["projects"], 1)

    def test_get_gpa_distribution_shape(self):
        distribution = get_gpa_distribution()
        self.assertEqual(len(distribution), 6)
        for bucket in distribution:
            self.assertIn("label", bucket)
            self.assertIn("value", bucket)
            self.assertIsInstance(bucket["value"], int)

    def test_get_attendance_trends(self):
        trends = get_attendance_trends()
        self.assertEqual(len(trends), 1)
        self.assertIn("month", trends[0])
        self.assertIn("value", trends[0])
        self.assertEqual(trends[0]["value"], 85.0)

    def test_get_rating_analytics_aggregate(self):
        analytics = get_rating_analytics()
        self.assertIn("metrics", analytics)
        self.assertIn("gpa_distribution", analytics)
        self.assertIn("attendance_trends", analytics)

    def test_get_student_activities_with_event(self):
        Event.objects.create(
            name="Conf",
            category="science",
            date="2025-05-01",
            level="university",
            status="approved",
            points=10,
        )
        activities = get_student_activities(self.user)
        self.assertEqual(len(activities), 2)
        conf = next(a for a in activities if a["name"] == "Conf")
        self.assertEqual(conf["event_date"], "2025-05-01")
        self.assertEqual(conf["event_level"], "university")


class RatingViewCompatibilityTests(TestCase):
    def setUp(self):
        self.user, self.student = _make_student_user(
            "rating-student", total_score=100, average_score=4.0
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_rating_view_stats_match_service(self):
        response = self.client.get("/api/rating/", secure=True)
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertIn("students", data)
        self.assertIn("stats", data)
        stats = data["stats"]
        self.assertIn("myPlace", stats)
        self.assertIn("topScore", stats)
        self.assertIn("averageScore", stats)
        self.assertIn("activityLevel", stats)

    def test_rating_view_stats_reflect_filtered_course_cohort(self):
        user2, _student2 = _make_student_user(
            "cohort-1", total_score=200, average_score=4.5, course=1
        )
        _user3, _student3 = _make_student_user(
            "cohort-2", total_score=300, average_score=5.0, course=2
        )
        response = self.client.get("/api/rating/?course=1", secure=True)
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(len(data["students"]), 2)
        stats = data["stats"]
        self.assertEqual(stats["myPlace"], 2)
        self.assertEqual(stats["topScore"], 200)
        self.assertEqual(stats["averageScore"], 150.0)
