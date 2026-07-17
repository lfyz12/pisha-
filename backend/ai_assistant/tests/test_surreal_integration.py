"""Opt-in integration test for ai_assistant.services.surreal against a real server.

Skipped unless SURREALDB_TEST_URL points at a running SurrealDB v3 instance
(SURREALDB_TEST_USER / SURREALDB_TEST_PASS default to the local test
container credentials root/testpass), e.g.:

    docker run -d --name surreal-fix-test -p 18000:8000 \
        surrealdb/surrealdb:v3.2 start --user root --pass testpass memory
    SURREALDB_TEST_URL=ws://localhost:18000 \
        python manage.py test ai_assistant.tests.test_surreal_integration \
        --settings=test_settings_local

Uses AI_EMBEDDING_DIM=8 so vectors stay tiny; ensure_schema() reads the
dimension at call time, so the index is (re)defined for the test dimension.
"""

import os
from unittest import skipUnless

from django.test import SimpleTestCase, override_settings

from ai_assistant.services import surreal

_TEST_URL = os.environ.get("SURREALDB_TEST_URL")
_TEST_USER = os.environ.get("SURREALDB_TEST_USER", "root")
_TEST_PASS = os.environ.get("SURREALDB_TEST_PASS", "testpass")

_TEST_DIM = 8

TEXTS = [
    "Admission deadline for the autumn intake is in September.",
    "Academic scholarship application requires a transcript.",
    "A completely unrelated note about cooking recipes.",
]
# Roughly orthogonal 8-dim vectors; chunk 0 is the nearest neighbour of the
# query vector used below.
VECTORS = [[float(i == j) for i in range(_TEST_DIM)] for j in range(len(TEXTS))]


def _chunk_count(doc_id: str) -> int:
    rows = surreal.get_client().query(
        "SELECT count() FROM kb_chunk WHERE doc_id = $doc_id GROUP ALL;",
        {"doc_id": doc_id},
    )
    return rows[0]["count"] if rows else 0


@skipUnless(
    _TEST_URL,
    "SURREALDB_TEST_URL is not set; skipping the SurrealDB integration test.",
)
@override_settings(
    SURREALDB_URL=_TEST_URL,
    SURREALDB_USER=_TEST_USER,
    SURREALDB_PASS=_TEST_PASS,
    AI_EMBEDDING_DIM=_TEST_DIM,
)
class SurrealIntegrationTests(SimpleTestCase):
    def setUp(self):
        # Reset the singleton so the client reconnects with the overridden
        # settings (and to not leak connections between tests).
        surreal.close_client()
        self.addCleanup(surreal.close_client)

    def test_schema_upsert_search_delete_roundtrip(self):
        surreal.ensure_schema()

        # Upsert: three chunks of one document are really created.
        surreal.upsert_chunks(
            "kb_chunk",
            "it-doc-1",
            {"categories": ["integration"]},
            TEXTS,
            VECTORS,
        )
        self.assertEqual(_chunk_count("it-doc-1"), len(TEXTS))

        # Re-ingest of the same document must not duplicate rows.
        surreal.upsert_chunks(
            "kb_chunk",
            "it-doc-1",
            {"categories": ["integration"]},
            TEXTS,
            VECTORS,
        )
        self.assertEqual(_chunk_count("it-doc-1"), len(TEXTS))

        # Hybrid search: the admission chunk is found by vector and/or text.
        results = surreal.search(
            "kb_chunk",
            VECTORS[0],
            "admission deadline",
            categories=["integration"],
            limit=5,
        )
        self.assertTrue(results, "search returned no rows")
        self.assertTrue(
            any("Admission deadline" in row["text"] for row in results),
            f"admission chunk not found in {results!r}",
        )
        self.assertTrue(all(row["doc_id"] == "it-doc-1" for row in results))
        self.assertTrue(all("embedding" not in row for row in results))

        # The category filter excludes chunks outside the given categories.
        filtered = surreal.search(
            "kb_chunk", VECTORS[0], "admission deadline", categories=["other"]
        )
        self.assertEqual(filtered, [])

        # Delete: every chunk of the document is really removed.
        surreal.delete_doc_chunks("kb_chunk", "it-doc-1")
        self.assertEqual(_chunk_count("it-doc-1"), 0)
