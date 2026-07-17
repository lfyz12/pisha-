"""Provision the SurrealDB schema used by the AI assistant."""

from django.core.management.base import BaseCommand

from ai_assistant.services.surreal import CHUNK_TABLES, ensure_schema


class Command(BaseCommand):
    help = (
        "Define the SurrealDB chunk tables (kb_chunk, project_chunk) with "
        "their HNSW vector and BM25 full-text indexes. Idempotent."
    )

    def handle(self, *args, **options):
        ensure_schema()
        self.stdout.write(
            self.style.SUCCESS(
                "SurrealDB schema is ready: "
                + ", ".join(CHUNK_TABLES)
                + " (HNSW vector + BM25 full-text indexes)."
            )
        )
