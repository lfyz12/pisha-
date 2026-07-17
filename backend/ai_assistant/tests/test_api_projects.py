"""API tests for the student project endpoints — external services mocked."""

import os
import shutil
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from ai_assistant.models import StudentProject
from ai_assistant.tasks import process_student_project
from security.models import AccessPolicy
from students.models import Student
from users.models import MfaDevice, User

PROJECTS_URL = "/api/ai/projects/"


class TempMediaRootMixin:
    """Give each class its own MEDIA_ROOT, created and removed with the class."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media_root = tempfile.mkdtemp(prefix="ai_assistant_test_media_")
        cls._media_override = override_settings(MEDIA_ROOT=cls._media_root)
        cls._media_override.enable()
        cls.addClassCleanup(cls._media_override.disable)
        cls.addClassCleanup(shutil.rmtree, cls._media_root, ignore_errors=True)


def _make_student_user(username, student_id):
    """A student-role user plus the Student profile sharing its id."""
    user = User.objects.create_user(
        username=username, password="secret", role=User.Role.STUDENT
    )
    student = Student.objects.create(
        id=user.id,
        name=f"{username} name",
        initials="SN",
        student_id=student_id,
        course=1,
        group_name="G-1",
    )
    return user, student


class StudentProjectAPITests(TempMediaRootMixin, TestCase):
    def setUp(self):
        self.user, self.student = _make_student_user("proj-student", "P-0001")
        self.other_user, self.other_student = _make_student_user(
            "other-student", "P-0002"
        )
        self.admin = User.objects.create_user(
            username="proj-admin", password="secret", role=User.Role.ADMIN
        )
        MfaDevice.objects.create(
            user=self.admin, secret_encrypted="secret", confirmed_at=timezone.now()
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

    def _set_allow_ai_chat(self, value):
        policy = AccessPolicy.current()
        policy.allow_ai_chat = value
        policy.save(update_fields=["allow_ai_chat"])

    def _md_file(self, name="notes.md"):
        return SimpleUploadedFile(
            name, b"# Project\nMy project notes.", content_type="text/markdown"
        )

    def _project(self, student, **kwargs):
        defaults = {
            "title": "Owned project",
            "file": SimpleUploadedFile("owned.md", b"# Owned"),
        }
        defaults.update(kwargs)
        return StudentProject.objects.create(student=student, **defaults)

    def test_post_and_get_forbidden_without_policy_flag(self):
        self._set_allow_ai_chat(False)
        response = self.client.post(
            PROJECTS_URL, {"file": self._md_file()}, format="multipart", secure=True
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("message", response.data)
        self.assertEqual(StudentProject.objects.count(), 0)

        response = self.client.get(PROJECTS_URL, secure=True)
        self.assertEqual(response.status_code, 403)

    def test_student_uploads_project_with_flag_enabled(self):
        self._set_allow_ai_chat(True)
        with patch.object(process_student_project, "delay") as mock_delay:
            response = self.client.post(
                PROJECTS_URL, {"file": self._md_file()}, format="multipart", secure=True
            )
        self.assertEqual(response.status_code, 201)
        project = StudentProject.objects.get()
        self.assertEqual(project.student, self.student)
        self.assertEqual(project.title, "notes")  # default: file name
        self.assertEqual(project.status, StudentProject.Status.PENDING)
        self.assertEqual(response.data["status"], 201)
        mock_delay.assert_called_once_with(str(project.id))

    def test_upload_rejects_unsupported_extension(self):
        self._set_allow_ai_chat(True)
        with patch.object(process_student_project, "delay") as mock_delay:
            response = self.client.post(
                PROJECTS_URL,
                {"file": SimpleUploadedFile("evil.exe", b"MZ-binary")},
                format="multipart",
                secure=True,
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(StudentProject.objects.count(), 0)
        mock_delay.assert_not_called()

    def test_list_returns_only_own_projects(self):
        self._set_allow_ai_chat(True)
        own = self._project(self.student, title="Mine")
        self._project(self.other_student, title="Not mine")
        response = self.client.get(PROJECTS_URL, secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 1)
        ids = [item["id"] for item in response.data["data"]]
        self.assertEqual(ids, [str(own.id)])

    def test_foreign_project_detail_is_not_found(self):
        self._set_allow_ai_chat(True)
        foreign = self._project(self.other_student)
        response = self.client.get(f"{PROJECTS_URL}{foreign.id}/", secure=True)
        self.assertEqual(response.status_code, 404)
        response = self.client.delete(f"{PROJECTS_URL}{foreign.id}/", secure=True)
        self.assertEqual(response.status_code, 404)
        self.assertTrue(StudentProject.objects.filter(pk=foreign.id).exists())

    def test_owner_deletes_project_chunks_file_and_record(self):
        self._set_allow_ai_chat(True)
        project = self._project(self.student)
        file_path = project.file.path
        self.assertTrue(os.path.exists(file_path))
        with patch("ai_assistant.views.delete_doc_chunks") as mock_delete:
            response = self.client.delete(f"{PROJECTS_URL}{project.id}/", secure=True)
        self.assertEqual(response.status_code, 204)
        mock_delete.assert_called_once_with("project_chunk", str(project.id))
        self.assertFalse(os.path.exists(file_path))
        self.assertFalse(StudentProject.objects.filter(pk=project.id).exists())

    def test_admin_without_student_profile_gets_403(self):
        # Admins pass the policy gate but have no Student profile to own projects.
        self._set_allow_ai_chat(False)
        response = self.admin_client.post(
            PROJECTS_URL, {"file": self._md_file()}, format="multipart", secure=True
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("message", response.data)
        self.assertEqual(StudentProject.objects.count(), 0)

        response = self.admin_client.get(PROJECTS_URL, secure=True)
        self.assertEqual(response.status_code, 403)
