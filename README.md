# Pisha

Production-ready React application skeleton built with modern tooling and scalable architecture.

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
