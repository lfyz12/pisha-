"""SurrealDB repository for the AI assistant knowledge base.

Stores text chunks with their embedding vectors in two schemaless tables
(``kb_chunk`` for the general knowledge base, ``project_chunk`` for
project-specific documents) and provides hybrid retrieval: HNSW vector
(KNN) search combined with BM25 full-text search.

All SurrealQL (SurrealDB v3 syntax) lives in the constants and small builder
helpers at the top of this module so the issued statements stay auditable.
"""

import logging
import threading
from typing import Any

from django.conf import settings
from surrealdb import Surreal

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SurrealQL (SurrealDB v3) — keep every issued statement in this section.
# ---------------------------------------------------------------------------

TABLE_KB_CHUNK = "kb_chunk"
TABLE_PROJECT_CHUNK = "project_chunk"
CHUNK_TABLES = (TABLE_KB_CHUNK, TABLE_PROJECT_CHUNK)

ANALYZER_NAME = "chunk_analyzer"

DEFINE_ANALYZER_SQL = (
    f"DEFINE ANALYZER IF NOT EXISTS {ANALYZER_NAME} "
    "TOKENIZERS blank,class FILTERS lowercase;"
)


def _define_table_sql(table: str) -> str:
    return f"DEFINE TABLE IF NOT EXISTS {table} SCHEMALESS;"


def _define_vector_index_sql(table: str, dimension: int) -> str:
    return (
        f"DEFINE INDEX IF NOT EXISTS {table}_embedding_hnsw ON TABLE {table} "
        f"FIELDS embedding HNSW DIMENSION {int(dimension)} DIST COSINE;"
    )


def _define_fulltext_index_sql(table: str) -> str:
    # SurrealDB v3: FULLTEXT is the concurrent successor of the v2 SEARCH clause.
    return (
        f"DEFINE INDEX IF NOT EXISTS {table}_text_fulltext ON TABLE {table} "
        f"FIELDS text FULLTEXT ANALYZER {ANALYZER_NAME} BM25 HIGHLIGHTS;"
    )


INSERT_CHUNKS_SQL = "INSERT INTO {table} $records;"

DELETE_DOC_CHUNKS_SQL = "DELETE {table} WHERE doc_id = $doc_id;"

_CATEGORY_FILTER_SQL = " AND categories CONTAINSANY $categories"


def _knn_ef(limit: int) -> int:
    """HNSW candidate-list size (EF) for a KNN query; must exceed the limit."""
    return max(limit * 4, 40)


# SurrealQL requires the KNN limit and EF as integer literals (they cannot be
# bound parameters), so both are int-coerced and interpolated. SurrealDB v3
# dropped the bare <|k|> form: <|k, EF|> is required to hit the HNSW index.
VECTOR_SEARCH_SQL = (
    "SELECT *, vector::distance::knn() AS score FROM {table} "
    "WHERE embedding <|{limit}, {ef}|> $vector{category_filter};"
)

FULLTEXT_SEARCH_SQL = (
    "SELECT *, search::score(0) AS score FROM {table} "
    "WHERE text @0@ $query_text{category_filter} "
    "LIMIT {limit};"
)

# ---------------------------------------------------------------------------
# Connection handling — one lazily created, process-wide shared connection.
# ---------------------------------------------------------------------------

_client: Any = None
_client_lock = threading.Lock()

# Serializes every RPC on the shared connection: the blocking websocket
# client is not thread-safe, but gunicorn gthread workers call it from
# several threads. QPS is low, so a single process-wide lock is cheap.
_query_lock = threading.Lock()


def _query(db: Any, statement: str, params: dict | None = None) -> Any:
    """Run one SurrealQL statement on the shared client, serialized."""
    with _query_lock:
        if params is None:
            return db.query(statement)
        return db.query(statement, params)


def _connect() -> Any:
    """Create and authenticate a new blocking SurrealDB connection.

    The surrealdb 2.x blocking websocket client establishes its socket lazily
    on the first RPC call, so ``signin`` doubles as the connect step.
    """
    db = Surreal(settings.SURREALDB_URL)
    db.signin({"user": settings.SURREALDB_USER, "pass": settings.SURREALDB_PASS})
    db.use(settings.SURREALDB_NS, settings.SURREALDB_DB)
    return db


def get_client() -> Any:
    """Return the shared SurrealDB connection, connecting on first use."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = _connect()
    return _client


def close_client() -> None:
    """Close and forget the shared connection (safe to call when not connected)."""
    global _client
    with _client_lock:
        client, _client = _client, None
    if client is not None:
        try:
            client.close()
        except Exception:  # noqa: BLE001 - closing must never raise
            logger.exception("Error while closing the SurrealDB connection")


def _validate_table(table: str) -> None:
    if table not in CHUNK_TABLES:
        raise ValueError(
            f"Unknown chunk table {table!r}; expected one of {CHUNK_TABLES}."
        )


# ---------------------------------------------------------------------------
# Repository operations.
# ---------------------------------------------------------------------------


def ensure_schema() -> None:
    """Define chunk tables and their vector/full-text indexes (idempotent)."""
    db = get_client()
    statements = [DEFINE_ANALYZER_SQL]
    for table in CHUNK_TABLES:
        statements.append(_define_table_sql(table))
        statements.append(_define_vector_index_sql(table, settings.AI_EMBEDDING_DIM))
        statements.append(_define_fulltext_index_sql(table))
    for statement in statements:
        _query(db, statement)
    logger.info("SurrealDB schema ensured for tables: %s", ", ".join(CHUNK_TABLES))


def upsert_chunks(
    table: str,
    doc_id: str,
    meta: dict,
    chunks: list[str],
    vectors: list[list[float]],
) -> None:
    """Replace the chunks of document ``doc_id`` in ``table`` (idempotent).

    Existing rows for ``doc_id`` are deleted first, so re-ingesting a document
    never leaves duplicated or stale chunks behind; the new chunks are then
    written with a single batched INSERT (one RPC for the whole document).

    Each record carries ``doc_id``, its ``chunk_index``, the ``text``, the
    ``embedding`` vector and every key from ``meta`` (e.g. ``categories``).
    """
    _validate_table(table)
    if len(chunks) != len(vectors):
        raise ValueError(
            f"chunks and vectors must have the same length "
            f"({len(chunks)} != {len(vectors)})."
        )
    records = [
        {
            **(meta or {}),
            "doc_id": doc_id,
            "chunk_index": chunk_index,
            "text": text,
            "embedding": embedding,
        }
        for chunk_index, (text, embedding) in enumerate(zip(chunks, vectors))
    ]
    db = get_client()
    _query(db, DELETE_DOC_CHUNKS_SQL.format(table=table), {"doc_id": doc_id})
    if records:
        _query(db, INSERT_CHUNKS_SQL.format(table=table), {"records": records})


def delete_doc_chunks(table: str, doc_id: str) -> None:
    """Delete every chunk of document ``doc_id`` from ``table``."""
    _validate_table(table)
    _query(
        get_client(),
        DELETE_DOC_CHUNKS_SQL.format(table=table),
        {"doc_id": doc_id},
    )


def search(
    table: str,
    query_vector: list[float],
    query_text: str,
    categories: list[str] | None = None,
    limit: int = 20,
) -> list[dict]:
    """Hybrid retrieval over ``table``: KNN vector search + full-text match.

    Runs both searches, unions the hits deduplicated by record id (vector
    hits first, each keeping its ``score``), and caps the result at ``limit``.
    When ``categories`` is given, both searches only consider chunks whose
    ``categories`` field overlaps with it.

    Note: ``score`` values are NOT comparable across the two legs — vector
    hits carry a cosine distance (lower is better) while full-text hits carry
    a BM25 score (higher is better). Callers that need a single ranking must
    rerank the merged list (see services.llm.rerank).
    """
    _validate_table(table)
    limit = int(limit)
    db = get_client()

    params: dict[str, Any] = {"vector": query_vector, "query_text": query_text}
    category_filter = ""
    if categories:
        params["categories"] = list(categories)
        category_filter = _CATEGORY_FILTER_SQL

    vector_rows = _query(
        db,
        VECTOR_SEARCH_SQL.format(
            table=table,
            limit=limit,
            ef=_knn_ef(limit),
            category_filter=category_filter,
        ),
        params,
    )
    fulltext_rows = _query(
        db,
        FULLTEXT_SEARCH_SQL.format(
            table=table, limit=limit, category_filter=category_filter
        ),
        params,
    )

    results: list[dict] = []
    seen_ids: set[str] = set()
    for row in list(vector_rows or []) + list(fulltext_rows or []):
        record_id = str(row.get("id"))
        if record_id in seen_ids:
            continue
        seen_ids.add(record_id)
        row = dict(row)
        row.pop("embedding", None)  # never ship raw vectors to callers
        results.append(row)
        if len(results) >= limit:
            break
    return results
