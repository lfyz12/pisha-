"""Serializers for the AI assistant knowledge base and student projects."""

import os
from urllib.parse import urlparse

from rest_framework import serializers

from .models import GrantCategory, KBDocument, StudentProject
from .services.validators import validate_upload_file

#: Extensions accepted for knowledge-base documents.
KB_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}

#: Extensions accepted for student project files.
PROJECT_ALLOWED_EXTENSIONS = {".md", ".docx", ".pdf", ".pptx"}


class GrantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GrantCategory
        fields = ["id", "name", "slug", "description", "is_active"]


def _categories_representation(instance):
    """Read representation of a document's categories: nested slug + name."""
    return [
        {"slug": category.slug, "name": category.name}
        for category in instance.categories.all()
    ]


def _default_title_from_file(name):
    """File name without path and extension, trimmed to the title field."""
    stem = os.path.splitext(os.path.basename(name or ""))[0].strip()
    return (stem or "document")[:300]


def _default_title_from_url(url):
    """Host + path of the URL, trimmed to the title field."""
    parsed = urlparse(url)
    candidate = f"{parsed.netloc}{parsed.path}".strip("/") or parsed.netloc
    return (candidate or "document")[:300]


def _categories_field():
    """Write categories as a list of slugs against active GrantCategory rows."""
    return serializers.SlugRelatedField(
        slug_field="slug",
        many=True,
        queryset=GrantCategory.objects.filter(is_active=True),
        required=False,
    )


class KBDocumentSerializer(serializers.ModelSerializer):
    """Read representation of a KB document; create from a file or a URL.

    On create exactly one of ``file`` / ``source_url`` must be given; the
    ``source_type`` and a default ``title`` are derived from the source.
    ``categories`` is written as a list of category slugs and read back as
    nested ``{slug, name}`` objects.
    """

    categories = _categories_field()
    title = serializers.CharField(max_length=300, required=False)

    class Meta:
        model = KBDocument
        fields = [
            "id",
            "title",
            "source_type",
            "source_url",
            "file",
            "status",
            "error",
            "summary",
            "categories",
            "chunk_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "source_type",
            "status",
            "error",
            "summary",
            "chunk_count",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "file": {"write_only": True, "required": False},
            "source_url": {"required": False},
        }

    def validate_file(self, value):
        validate_upload_file(value, KB_ALLOWED_EXTENSIONS)
        return value

    def validate(self, attrs):
        if self.instance is None and bool(attrs.get("file")) == bool(
            attrs.get("source_url")
        ):
            raise serializers.ValidationError(
                "Exactly one of file or source_url must be provided."
            )
        return attrs

    def create(self, validated_data):
        categories = validated_data.pop("categories", [])
        upload = validated_data.get("file")
        if upload:
            validated_data["source_type"] = KBDocument.SourceType.FILE
            validated_data.setdefault("title", _default_title_from_file(upload.name))
        else:
            validated_data["source_type"] = KBDocument.SourceType.URL
            validated_data.setdefault(
                "title", _default_title_from_url(validated_data["source_url"])
            )
        document = KBDocument.objects.create(**validated_data)
        document.categories.set(categories)
        return document

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["categories"] = _categories_representation(instance)
        return data


class StudentProjectSerializer(serializers.ModelSerializer):
    """Read representation of a student project; create from a file upload.

    ``categories`` is written as a list of category slugs and read back as
    nested ``{slug, name}`` objects.
    """

    categories = _categories_field()
    title = serializers.CharField(max_length=300, required=False)

    class Meta:
        model = StudentProject
        fields = [
            "id",
            "title",
            "file",
            "status",
            "error",
            "summary",
            "categories",
            "chunk_count",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "error",
            "summary",
            "chunk_count",
            "created_at",
        ]
        extra_kwargs = {"file": {"write_only": True}}

    def validate_file(self, value):
        validate_upload_file(value, PROJECT_ALLOWED_EXTENSIONS)
        return value

    def create(self, validated_data):
        categories = validated_data.pop("categories", [])
        upload = validated_data["file"]
        validated_data.setdefault("title", _default_title_from_file(upload.name))
        project = StudentProject.objects.create(**validated_data)
        project.categories.set(categories)
        return project

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["categories"] = _categories_representation(instance)
        return data
