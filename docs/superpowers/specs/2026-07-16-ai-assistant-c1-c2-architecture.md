# AI Consultant Subsystem — C1/C2 Architecture

Scope: the AI subsystem of the UPISH platform (plan phases 2–4: knowledge base,
student projects, agent chat), shown in the context of the whole system.
Notation: C4 model (C1 = System Context, C2 = Container), Mermaid C4 diagrams.

## C1 — System Context

```mermaid
C4Context
    title C1. System Context — UPISH Platform with AI Consultant

    Person(student, "Student", "Checks rating, chats with the AI consultant, uploads project reports (md/docx/pdf/pptx)")
    Person(admin, "Administrator", "Curates the grants knowledge base (files and URLs), manages categories and access policies")

    System(pisha, "UPISH Platform", "Student rating, scholarships, events + AI consultant for grants and development trajectories")

    System_Ext(litellm, "LiteLLM Proxy", "External LLM gateway: chat completions, embeddings, rerank (OpenAI-compatible API)")
    System_Ext(sources, "Grant Sources", "Grant competition websites, regulatory documents (read by URL)")

    Rel(student, pisha, "Chat, rating, project uploads", "HTTPS")
    Rel(admin, pisha, "KB documents/URLs, categories, policies", "HTTPS")
    Rel(pisha, litellm, "chat / embeddings / rerank", "HTTPS, OpenAI-compatible")
    Rel(pisha, sources, "Fetch page text by URL", "HTTPS")
```

## C2 — Containers

```mermaid
C4Container
    title C2. Containers — AI subsystem (plan phases 2-4)

    Person(student, "Student")
    Person(admin, "Administrator")

    System_Boundary(pisha, "UPISH Platform") {
        Container(spa, "React SPA", "React 19, Vite, Tailwind, Zustand, TanStack Query", "Chat with SSE streaming, KB admin UI, project uploads, rating pages")
        Container(nginx, "Nginx", "reverse proxy + static", "Serves SPA, proxies /api, buffering off for /api/ai/ (SSE), strict CSP")
        Container(api, "Django Backend", "Django 5.2, DRF, gunicorn", "REST API, cookie-JWT auth, ai_assistant app: LangGraph agent + tools, SSE streaming, file upload")
        Container(worker, "Celery Worker", "Celery 5 + Redis", "Ingest pipeline: parse -> classify -> summarize -> chunk -> embed -> upsert")
        ContainerDb(postgres, "PostgreSQL 16", "relational DB", "Users, students, rating, activities, scholarships, KBDocument, StudentProject, ChatSession/Message, AccessPolicy")
        ContainerDb(redis, "Redis 7", "message broker", "Celery broker + result backend")
        ContainerDb(surreal, "SurrealDB v3", "vector + document DB", "kb_chunk, project_chunk; HNSW vector index + full-text index (hybrid search)")
    }

    System_Ext(litellm, "LiteLLM Proxy", "chat / embeddings / rerank")
    System_Ext(sources, "Grant websites (by URL)")

    Rel(student, spa, "Uses", "HTTPS")
    Rel(admin, spa, "Uses", "HTTPS")
    Rel(spa, nginx, "REST + SSE", "HTTPS")
    Rel(nginx, api, "proxy /api", "HTTP")
    Rel(api, postgres, "ORM / SQL")
    Rel(api, redis, "enqueue ingest tasks")
    Rel(worker, redis, "consume tasks")
    Rel(worker, postgres, "read/write status, ORM")
    Rel(worker, surreal, "upsert chunks + vectors", "WS / SurrealQL")
    Rel(worker, litellm, "classify, summarize, embed", "HTTPS")
    Rel(worker, sources, "fetch URL -> text", "HTTPS")
    Rel(api, surreal, "hybrid search (vector + FTS)", "WS / SurrealQL")
    Rel(api, litellm, "chat completions, rerank", "HTTPS")
```

## Key data flows

1. **KB ingest (admin file/URL):** API stores `KBDocument` (Postgres) → Celery task
   extracts text (docx/pdf/pptx/md/HTML via trafilatura) → LLM classifier assigns
   `GrantCategory` slugs + summary → chunking → embeddings via LiteLLM → upsert into
   SurrealDB `kb_chunk` → status `ready` in Postgres.
2. **Student project ingest:** same pipeline into `project_chunk` with `student_id`
   metadata; project categories link the project to the grant taxonomy, which enables
   automatic "project -> relevant grants" matching.
3. **Agent chat (SSE):** user message -> `ChatMessage` (Postgres) -> LangGraph react
   agent with student context card; tools read rating/analytics/activities from
   Postgres and search grants via SurrealDB hybrid search + LiteLLM rerank; answer
   tokens stream back over SSE; assistant message persisted.

## Advantages, top to bottom

- **UI:** live SSE streaming, session history, quick prompts, project attachment
  directly in chat; admin KB management without touching code; processing statuses
  visible (`pending -> ready/failed`).
- **API & security:** cookie-JWT + CSRF, central `AccessPolicy` flag for AI access,
  audit log events, chat throttling (30/hour per user) for LLM cost control,
  strict upload validation (format, size, zip-bomb checks); uploaded files are
  never publicly served.
- **Agent:** answers are grounded in real data — tools read the actual rating,
  analytics and activities from Postgres and grants from the vector store, so the
  model does not invent numbers or deadlines; system prompt carries the student
  context card plus their project summaries for personal trajectories; LangGraph
  tool-calling is transparent and easy to extend.
- **Knowledge pipeline:** any source (file or URL) -> parse -> LLM classify +
  summarize -> chunk -> embed, fully automated; hybrid retrieval (HNSW vector +
  full-text BM25) with a reranker yields relevant grants instead of fuzzy keyword
  matches; one category taxonomy links grants and student projects.
- **Analytics:** the agent uses the same rating/analytics services as the
  dashboards (place, trend, averages, distributions, attendance), so advice like
  "how to raise my rating" is computed from real metrics, not generic tips.
- **Infrastructure:** heavy ingest is async (Celery), API stays responsive;
  SurrealDB covers documents + vectors + FTS in one engine; LiteLLM is a single
  gateway — model/provider changes need no code changes; the whole stack spins up
  with `docker compose up`, CI runs without external services (mocks).
