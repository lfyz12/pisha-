"""Tests for ai_assistant.services.surreal — the surrealdb client is mocked."""

from unittest.mock import Mock, patch

from django.conf import settings
from django.core.management import call_command
from django.test import SimpleTestCase

from ai_assistant.services import surreal


def _issued_sql(client):
    """All SQL strings passed to ``client.query`` so far."""
    return [call.args[0] for call in client.query.call_args_list]


class ClientConnectionTests(SimpleTestCase):
    def setUp(self):
        surreal.close_client()
        self.addCleanup(surreal.close_client)

    @patch("ai_assistant.services.surreal.Surreal")
    def test_get_client_connects_signs_in_and_switches_ns_db(self, surreal_cls):
        client = surreal.get_client()

        surreal_cls.assert_called_once_with(settings.SURREALDB_URL)
        client.signin.assert_called_once_with(
            {"user": settings.SURREALDB_USER, "pass": settings.SURREALDB_PASS}
        )
        client.use.assert_called_once_with(settings.SURREALDB_NS, settings.SURREALDB_DB)

    @patch("ai_assistant.services.surreal.Surreal")
    def test_get_client_is_a_lazy_singleton(self, surreal_cls):
        first = surreal.get_client()
        second = surreal.get_client()

        self.assertIs(first, second)
        surreal_cls.assert_called_once()


class RepositoryTests(SimpleTestCase):
    def setUp(self):
        self.client = Mock()
        patcher = patch(
            "ai_assistant.services.surreal.get_client", return_value=self.client
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    # -- ensure_schema ------------------------------------------------------

    def test_ensure_schema_defines_tables_and_indexes(self):
        surreal.ensure_schema()

        sql = "\n".join(_issued_sql(self.client))
        for table in ("kb_chunk", "project_chunk"):
            self.assertIn(f"DEFINE TABLE IF NOT EXISTS {table} SCHEMALESS", sql)
        self.assertIn("HNSW", sql)
        self.assertIn(f"DIMENSION {settings.AI_EMBEDDING_DIM}", sql)
        self.assertIn("DIST COSINE", sql)
        self.assertIn("FULLTEXT", sql)
        self.assertIn("BM25", sql)
        self.assertIn("HIGHLIGHTS", sql)
        self.assertIn("DEFINE ANALYZER", sql)

    def test_ensure_schema_is_idempotent(self):
        surreal.ensure_schema()

        for statement in _issued_sql(self.client):
            self.assertIn("IF NOT EXISTS", statement)

    # -- upsert_chunks -------------------------------------------------------

    def test_upsert_chunks_creates_one_record_per_chunk(self):
        surreal.upsert_chunks(
            "kb_chunk",
            "doc-1",
            {"categories": ["admission"], "title": "Rules"},
            ["chunk a", "chunk b"],
            [[0.1, 0.2], [0.3, 0.4]],
        )

        self.assertEqual(self.client.query.call_count, 2)
        for index, call in enumerate(self.client.query.call_args_list):
            sql, params = call.args
            self.assertEqual(sql, "CREATE kb_chunk CONTENT $record;")
            self.assertEqual(
                params["record"],
                {
                    "categories": ["admission"],
                    "title": "Rules",
                    "doc_id": "doc-1",
                    "chunk_index": index,
                    "text": ["chunk a", "chunk b"][index],
                    "embedding": [[0.1, 0.2], [0.3, 0.4]][index],
                },
            )

    def test_upsert_chunks_rejects_length_mismatch(self):
        with self.assertRaises(ValueError):
            surreal.upsert_chunks("kb_chunk", "doc-1", {}, ["a", "b"], [[0.1]])

    def test_upsert_chunks_rejects_unknown_table(self):
        with self.assertRaises(ValueError):
            surreal.upsert_chunks("other_table", "doc-1", {}, [], [])

    # -- delete_doc_chunks ----------------------------------------------------

    def test_delete_doc_chunks_deletes_by_doc_id(self):
        surreal.delete_doc_chunks("project_chunk", "doc-9")

        self.client.query.assert_called_once_with(
            "DELETE project_chunk WHERE doc_id = $doc_id;", {"doc_id": "doc-9"}
        )

    # -- search ----------------------------------------------------------------

    def test_search_unions_deduplicates_and_caps(self):
        self.client.query.side_effect = [
            [
                {"id": "kb_chunk:1", "text": "a", "score": 0.05, "embedding": [1.0]},
                {"id": "kb_chunk:2", "text": "b", "score": 0.10, "embedding": [2.0]},
            ],
            [
                {"id": "kb_chunk:2", "text": "b", "score": 7.5},
                {"id": "kb_chunk:3", "text": "c", "score": 6.0},
            ],
        ]

        results = surreal.search("kb_chunk", [0.1], "query text", limit=20)

        self.assertEqual([row["id"] for row in results], ["kb_chunk:1", "kb_chunk:2", "kb_chunk:3"])
        for row in results:
            self.assertNotIn("embedding", row)

    def test_search_caps_at_limit(self):
        self.client.query.side_effect = [
            [{"id": f"kb_chunk:{i}", "text": "x"} for i in range(5)],
            [{"id": "kb_chunk:9", "text": "y"}],
        ]

        results = surreal.search("kb_chunk", [0.1], "q", limit=3)

        self.assertEqual(len(results), 3)

    def test_search_builds_knn_and_fulltext_queries_for_table(self):
        self.client.query.side_effect = [[], []]

        surreal.search("project_chunk", [0.1], "hello")

        vector_sql, fulltext_sql = _issued_sql(self.client)
        self.assertIn("FROM project_chunk", vector_sql)
        self.assertIn("<|20|>", vector_sql)
        self.assertIn("vector::distance::knn()", vector_sql)
        self.assertIn("FROM project_chunk", fulltext_sql)
        self.assertIn("text @0@ $query_text", fulltext_sql)
        self.assertIn("search::score(0)", fulltext_sql)
        params = self.client.query.call_args.args[1]
        self.assertEqual(params["vector"], [0.1])
        self.assertEqual(params["query_text"], "hello")
        self.assertNotIn("categories", params)

    def test_search_applies_category_filter_to_both_queries(self):
        self.client.query.side_effect = [[], []]

        surreal.search("kb_chunk", [0.1], "hello", categories=["c1"], limit=5)

        for statement in _issued_sql(self.client):
            self.assertIn("categories CONTAINSANY $categories", statement)
        params = self.client.query.call_args.args[1]
        self.assertEqual(params["categories"], ["c1"])
        self.assertIn("<|5|>", _issued_sql(self.client)[0])

    def test_search_rejects_unknown_table(self):
        with self.assertRaises(ValueError):
            surreal.search("other_table", [0.1], "q")


class ManagementCommandTests(SimpleTestCase):
    @patch("ai_assistant.management.commands.init_surreal_schema.ensure_schema")
    def test_init_surreal_schema_command(self, ensure_schema):
        from io import StringIO

        out = StringIO()
        call_command("init_surreal_schema", stdout=out)

        ensure_schema.assert_called_once_with()
        self.assertIn("SurrealDB schema is ready", out.getvalue())
