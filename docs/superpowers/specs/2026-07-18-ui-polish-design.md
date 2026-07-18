# UI Polish — Design: Bundle Weight, Animation Layer, Glass & Interactivity

Date: 2026-07-18. Status: approved (via Q&A with the user).
Scope: balanced — bundle weight + animations + interactivity + Apple-style glass/parallax.
The unmerged `feature/onboarding-button-animations` branch is explicitly out of scope.

## Context

Findings from the UI audit (branch `fix/post-security-review-issues`):

- Single JS bundle **648 KB (196 KB gzip)** — zero code splitting; all pages load everywhere.
- All shadcn overlay animation classes (`animate-in`, `fade-in-0`, `zoom-in-95`,
  `slide-in-from-*` in dialog/sheet/dropdown/select/popover/tooltip/toast/alert-dialog)
  are **dead** — the `tw-animate-css` plugin is not installed. Overlays appear instantly.
- No `prefers-reduced-motion` handling anywhere.
- Dead interactivity zones: `overview` (no skeletons, no pending states), `profile`
  (fake save via setTimeout, no real pending), `analytics` + rating table (no skeleton),
  `scholarships` (hand-rolled `animate-pulse` block), `admin` (no skeletons).
- Candidate dead dependencies: `lucide-react`, `vaul`, `react-day-picker`, `cmdk`
  (verify by grep before removal; `cmdk` backs `components/ui/command.tsx` — remove
  both only if the component itself is unused).
- Existing custom `ui/icon.tsx` renders Material Symbols — preferred over lucide.

## Decisions

1. **CSS-only animation layer**: `tw-animate-css` dev-dependency (~3 KB) + a few custom
   `@keyframes` in `index.css`. No JS animation libraries (framer-motion adds 40–60 KB
   gzip — contradicts the weight goal).
2. **Balanced glass (Apple-style)**: fixed ambient background (subtle gradient mesh +
   slow-drifting radial blobs, 40–60 s) + glass treatment (`backdrop-filter: blur(16px)
   saturate(1.4)`, ~72–80% surface opacity) on header, sidebar, and cards. Parallax is
   zero-JS depth: content scrolls over the fixed background. No scroll-linked JS.
3. **Restraint**: one orchestrated moment per page (staggered `fade-up` of sections),
   no scattered effects. `prefers-reduced-motion: reduce` kills all animation,
   transitions, and ambient drift globally.

## Workstream A — Bundle weight

Target: initial JS < 400 KB minified; per-route chunks < 150 KB.

- `frontend/src/routes/index.tsx`: convert all page imports to `React.lazy` with a
  shared `Suspense` boundary; layout components stay eager.
- Page-level `Suspense` fallback: `components/page-skeleton.tsx` — page-shaped skeleton
  (header bar + content blocks), not a spinner.
- Dependency cleanup (grep-verified first): remove unused `lucide-react`, `vaul`,
  `react-day-picker`, `cmdk` (+ `ui/command.tsx` if orphaned); replace any stray
  lucide usages with `ui/icon`.
- No `vite.config.ts` changes (rolldown splits automatically once imports are dynamic).

## Workstream B — Animation layer

- `frontend/package.json`: add `tw-animate-css` (devDependencies).
- `frontend/src/index.css`:
  - `@import "tw-animate-css";` (revives all existing dead overlay animations).
  - `@keyframes fade-up` (translateY 8px → 0, opacity 0 → 1, 300–400 ms, ease-out) with
    `.animate-fade-up` utility and stagger helpers (`.motion-delay-100/200/300` via
    `animation-delay`).
  - `@keyframes message-in` for new chat bubbles.
  - `@keyframes ambient-drift` (slow translate/scale loop for background blobs).
  - `@media (prefers-reduced-motion: reduce)` global kill-switch for animations,
    transitions, and ambient drift.
- Apply staggered `fade-up` to top-level sections of `overview`, `dashboard`, `profile`
  (section wrappers only, no per-item noise). Apply `message-in` to chat bubbles.

## Workstream C — Glass & ambient background

- `index.css`:
  - `.app-background` — `position: fixed; inset: 0; z-index: -1` layer with a subtle
    gradient mesh derived from existing palette tokens (neutrals + primary at 6–10%
    alpha) and 2–3 large radial blobs animating with `ambient-drift`.
  - `.glass` utility — `background: color-mix(in srgb, <surface> 75%, transparent)`,
    `backdrop-filter: blur(16px) saturate(1.4)`, softened border via color-mix.
    Must work in both light and dark themes (derive from CSS variables, no hardcoded
    hex).
- Apply `.glass` to: `components/header.tsx`, `components/sidebar.tsx`, metric/info
  cards on `overview`/`dashboard`/`profile` (via the shared `surface-card` patterns,
  not one-off classes), chat window chrome, FAB (`dashboard-layout.tsx`).
- **Buttons**: add a `glass` variant to `components/ui/button.tsx` — frosted pill
  (translucent tinted background + `backdrop-filter: blur(12px)`, hover slightly more
  opaque, active scale-down consistent with existing buttons). Apply the variant to
  prominent action buttons: header actions, page primary CTAs (e.g. Excel import,
  «Новый чат»), FAB. Do NOT restyle small table/row action buttons globally
  (readability in dense areas).
- **Menu (sidebar nav items)**: nav links get a glass pill treatment — hover shows a
  soft frosted pill background, the active item keeps a slightly stronger frosted
  pill with the existing accent text color; implement via classes in
  `components/sidebar.tsx` (no JS).
- Mount `.app-background` once in `App.tsx` (or dashboard layout).
- Guardrails: no glass on dense data tables (readability); blur radius stays ≤16 px;
  blobs stay at low opacity so text contrast is unaffected.

## Workstream D — Interactivity dead zones

- `overview/index.tsx`: skeletons matching the final layout while queries load.
- `profile/index.tsx`: real pending state on save (disabled button + «Сохранение…»);
  remove the fake `setTimeout`-only feedback (keep the success tick after resolve).
- `analytics/index.tsx` + its rating table: table skeleton rows.
- `scholarships/index.tsx`: replace the hand-rolled pulse block with `Skeleton`
  components shaped like the cards.
- `admin/index.tsx` + `admin/knowledge-base.tsx`: table skeletons on first load;
  pending/disabled states on any mutation lacking them.

## Verification

- `npm run lint && npm run typecheck && npm run build` — all green.
- Bundle report before/after (initial chunk size, per-route chunks).
- Manual smoke checklist: overlay open/close animation; section fade-up on page
  navigation; glass blur visible over drifting background; reduced-motion (OS setting)
  disables all motion; skeletons appear on slow network (throttled).

## Non-goals

- Onboarding tour / RippleButton branch revival.
- Scroll-linked JS parallax, parallax libraries, WebGL/3D.
- Visual identity redesign (palette, typography, spacing system stay as-is).
- Glass on data-dense tables; animation of table row updates.
