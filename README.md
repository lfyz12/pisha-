# Pisha

Система рейтинга студентов с React frontend, Django REST API и PostgreSQL.

## Security setup

Production запуск требует явных секретов. Для Docker Compose скопируйте `./.env.example` в `./.env`; для локальной разработки backend — `backend/.env.example` в `backend/.env`. Задайте сильные значения и сгенерируйте ключ шифрования:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Никогда не используйте значения из `.env.example` как реальные секреты. PostgreSQL не публикуется на хост, а backend доступен через nginx по `/api`.

Администратор при первом входе подключает TOTP в Google Authenticator или совместимом приложении. Новые студенты получают уникальный временный пароль, который необходимо сменить при первом входе.

### Учётные данные администратора по умолчанию

После запуска и сидирования базы данных создаётся администратор:

- **Логин:** `admin`
- **Пароль:** значение переменной окружения `DEFAULT_ADMIN_PASSWORD`. Перед первым запуском задайте его в `.env` (для Docker — `./.env.example`, для локального backend — `backend/.env.example`); никогда не используйте значение из `.env.example` в production.

При первом входе администратору будет предложено настроить MFA (TOTP).

## Run with Docker

```bash
docker compose up --build
```

Frontend будет доступен на `http://localhost`. Для локальной frontend-разработки используйте `cd frontend && npm run dev`; backend и PostgreSQL должны быть запущены отдельно.

## AI-модуль

ИИ-консультант УПИШ: студенты общаются с ассистентом о рейтинге, грантах, стипендиях и траекториях развития и загружают свои проекты (md/docx/pdf/pptx); администратор ведёт базу знаний о грантах (файлы и URL). Ответы строятся на реальных данных (рейтинг, мероприятия, база знаний) через LangGraph-агента с инструментами; потоковая выдача — по SSE. Обработка документов (парсинг → классификация и саммари → чанкирование → эмбеддинги) выполняется асинхронно в Celery; векторный поиск — SurrealDB (HNSW + полнотекстовый BM25); все LLM-запросы идут через внешний LiteLLM-прокси.

Требуемые переменные окружения (шаблоны — `./.env.example` и `backend/.env.example`):

- `LITELLM_BASE_URL`, `LITELLM_API_KEY` — адрес и ключ LiteLLM-прокси (обязательны);
- `LITELLM_CHAT_MODEL`, `LITELLM_CLASSIFIER_MODEL`, `LITELLM_EMBEDDING_MODEL`, `LITELLM_RERANK_MODEL` — модели;
- `SURREALDB_URL`, `SURREALDB_NS`, `SURREALDB_DB`, `SURREALDB_USER`, `SURREALDB_PASSWORD` — подключение к SurrealDB;
- `REDIS_URL` — брокер Celery;
- `AI_EMBEDDING_DIM` (по умолчанию 1536 — должна совпадать с размерностью модели эмбеддингов), `AI_MAX_UPLOAD_MB` (по умолчанию 20).

Запуск — вместе со всем стеком:

```bash
docker compose up --build   # поднимает redis, surrealdb, backend и celery-worker
```

После первого запуска создайте схему SurrealDB (команда идемпотентна):

```bash
docker compose exec backend python manage.py init_surreal_schema
```

Доступ студентов к чату и проектам включается флагом `allow_ai_chat` в `AccessPolicy` (по умолчанию выключен; администраторы имеют доступ всегда).

Документация:

- [Дизайн AI-подсистемы](docs/superpowers/specs/2026-07-16-ai-assistant-design.md)
- [Архитектура C1/C2](docs/superpowers/specs/2026-07-16-ai-assistant-c1-c2-architecture.md)
- [Общая схема системы](docs/system-scheme-ru.md)

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** (build tool)
- **TailwindCSS v4** (styling)
- **React Router v8** (routing)
- **Zustand** (client state)
- **TanStack Query** (server state)
- **TanStack Table** (data tables)
- **shadcn/ui** (component library)
- **React Hook Form** + **Zod** (forms & validation)
- **Axios** (HTTP client)
- **Lucide React** (icons)
- **Husky** + **lint-staged** + **Commitlint** (git workflows)

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   └── data-table/      # TanStack Table wrappers
│       ├── data-table.tsx
│       ├── data-table-toolbar.tsx
│       ├── data-table-pagination.tsx
│       ├── data-table-column-visibility.tsx
│       ├── data-table-skeleton.tsx
│       └── data-table-empty.tsx
├── config/              # Application configuration
├── hooks/               # Shared custom hooks
├── layouts/             # Route layouts (Auth, Dashboard, Root)
├── lib/                 # Utilities (cn, api-client)
├── pages/               # Page components
│   ├── auth/            # Login, Forgot Password
│   ├── dashboard/       # Dashboard
│   ├── profile/         # Profile
│   ├── admin/           # Admin
│   └── errors/          # 404, 403
├── providers/           # React context providers
├── routes/              # React Router configuration
├── services/            # API service layer
├── stores/              # Zustand client-state stores
└── types/               # Shared TypeScript types
```

## Architecture Principles

### State Separation

- **TanStack Query**: API data, lists, entities, tables, reports, analytics
- **Zustand**: UI state only (theme, sidebar, modals, preferences)

### Component System

- All UI components are built on **shadcn/ui** primitives
- Reusable components use **CVA** (class-variance-authority) for variants
- Components are exported via barrel exports for clean imports

### DataTable System

Business pages never interact directly with TanStack Table. They use reusable wrappers:

- `DataTable` — main table component
- `DataTableToolbar` — search and filters
- `DataTablePagination` — pagination controls
- `DataTableColumnVisibility` — column toggle
- `DataTableSkeleton` — loading state
- `DataTableEmpty` — empty state

### Routing

Routes are defined in `src/routes/index.tsx` using `createBrowserRouter`.

Layouts:

- `RootLayout` — providers (Query, Theme, Tooltip)
- `AuthLayout` — centered layout for auth pages
- `DashboardLayout` — sidebar + header + main content

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type-check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## Path Aliases

`@/` maps to `src/`:

```tsx
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores";
import { cn } from "@/lib/utils";
```

## Quality Tools

- **ESLint** — linting with TypeScript + React rules
- **Prettier** — code formatting
- **EditorConfig** — consistent editor settings
- **Husky** — git hooks
- **lint-staged** — run linters on staged files
- **Commitlint** — enforce conventional commits
- **GitHub Actions** — CI pipeline (lint + typecheck + build)

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve dashboard loading issue
docs: update API documentation
```

## License

Private
