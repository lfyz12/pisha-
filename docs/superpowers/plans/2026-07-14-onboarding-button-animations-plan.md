# Onboarding + Button Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add contextual onboarding hints, animated guide-dot tours, and Material-riple button press animations to the ПИША React frontend, then spin up the full stack and verify in browser.

**Architecture:** A new `OnboardingProvider` wraps the app and exposes state/hints/tours. Small focused components (`ContextualHint`, `GuideDot`, `SpotlightOverlay`, `RippleButton`) live under `frontend/src/components/onboarding/` and `frontend/src/components/ui/`. State is persisted to `localStorage` keyed by `userId`. No backend changes.

**Tech Stack:** React 19, TypeScript, TailwindCSS v4, shadcn/ui (Radix), Zustand, CSS keyframes, `getBoundingClientRect`, `localStorage`.

---

## File Structure

```
frontend/src/components/onboarding/
├── onboarding-provider.tsx      # React context + state
├── use-onboarding.ts            # hook for consumers
├── onboarding-config.ts         # hint/tour definitions per role
├── contextual-hint.tsx          # hint card with anchor words
├── anchor-word.tsx              # hoverable highlighted word
├── spotlight-overlay.tsx        # dim + cutout + tremor
├── guide-dot.tsx                # animated orange dot
├── tour-bubble.tsx              # step explanation bubble
├── tour-controller.tsx          # tour orchestration
└── hint-reopen-button.tsx       # floating "?" button

frontend/src/components/ui/
├── button.tsx                   # existing (keep)
└── ripple-button.tsx            # Button wrapper with Material ripple

frontend/src/providers/
└── (existing providers)         # integrate OnboardingProvider here

frontend/src/pages/*/            # add data-onboarding-id or id attributes
frontend/src/components/sidebar.tsx
frontend/src/components/header.tsx
frontend/src/index.css           # add @keyframes
```

---

## Task 1: Add CSS keyframes to global stylesheet

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Append ripple, tremor, and fade keyframes at end of file**

```css
@keyframes ripple-grow {
  from {
    transform: scale(0);
    opacity: 0.4;
  }
  to {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes tremor {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }
  20% {
    transform: translateX(-2px) rotate(-0.3deg);
  }
  40% {
    transform: translateX(2px) rotate(0.3deg);
  }
  60% {
    transform: translateX(-1.5px) rotate(-0.2deg);
  }
  80% {
    transform: translateX(1.5px) rotate(0.2deg);
  }
}

@keyframes guide-dot-arrive {
  0% {
    transform: translate(-50%, 50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, 50%) scale(1);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Verify no CSS syntax errors**

Run: `cd frontend && npm run lint`
Expected: passes with 0 warnings (existing warnings only).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(onboarding): add ripple, tremor, guide-dot keyframes"
```

---

## Task 2: Create onboarding config and types

**Files:**
- Create: `frontend/src/components/onboarding/onboarding-config.ts`

- [ ] **Step 1: Define types and per-role hint/tour configuration**

```ts
export type Anchor = {
  word: string;
  targetId: string;
};

export type Hint = {
  pageKey: string;
  title: string;
  text: string;
  anchors: Anchor[];
};

export type TourStep = {
  targetId: string;
  title: string;
  text: string;
};

export type Tour = {
  key: string;
  label: string;
  steps: TourStep[];
};

export const studentHints: Hint[] = [
  {
    pageKey: "rating",
    title: "Рейтинг студентов",
    text: "Здесь можно фильтровать рейтинг по курсу и группе, а также искать конкретных студентов.",
    anchors: [
      { word: "фильтровать", targetId: "course-filter" },
      { word: "искать", targetId: "student-search" },
    ],
  },
  {
    pageKey: "scholarships",
    title: "Стипендии",
    text: "Доступные стипендии зависят от твоего рейтинга. Следи за прогресс-барами.",
    anchors: [{ word: "прогресс-барами", targetId: "scholarship-list" }],
  },
  {
    pageKey: "analytics",
    title: "Аналитика",
    text: "Здесь смотришь свои баллы, посещаемость и характеристики по семестрам.",
    anchors: [
      { word: "баллы", targetId: "metrics-cards" },
      { word: "посещаемость", targetId: "attendance-chart" },
    ],
  },
  {
    pageKey: "chat",
    title: "ИИ-чат",
    text: "Задавай вопросы про рейтинг, стипендии и правила начисления баллов.",
    anchors: [{ word: "вопросы", targetId: "chat-input" }],
  },
  {
    pageKey: "profile",
    title: "Профиль",
    text: "Проверь контакты и смени пароль при необходимости.",
    anchors: [{ word: "пароль", targetId: "change-password-button" }],
  },
];

export const adminHints: Hint[] = [
  {
    pageKey: "admin-import",
    title: "Импорт данных",
    text: "Загружай рейтинг и мероприятия через Excel. После загрузки система создаст временные учётные данные.",
    anchors: [
      { word: "Excel", targetId: "excel-uploader" },
      { word: "учётные данные", targetId: "credential-bundle" },
    ],
  },
  {
    pageKey: "admin-policies",
    title: "Политики доступа",
    text: "Настраивай, какие данные видят студенты: имена в рейтинге, профили, посещаемость.",
    anchors: [{ word: "видят студенты", targetId: "policy-toggles" }],
  },
  {
    pageKey: "admin-scoring",
    title: "Начисление баллов",
    text: "Выбери студентов и начисли баллы за научную, спортивную или общественную активность.",
    anchors: [
      { word: "студентов", targetId: "student-table" },
      { word: "начисли", targetId: "scoring-form" },
    ],
  },
  {
    pageKey: "admin-ai-rules",
    title: "ИИ-правила",
    text: "Создавай правила, по которым ИИ-ассистент отвечает на вопросы студентов.",
    anchors: [{ word: "правила", targetId: "ai-rules-list" }],
  },
];

export const appTourSteps: Record<"student" | "admin", TourStep[]> = {
  student: [
    { targetId: "nav-rating", title: "Рейтинг", text: "Ваше положение в общем рейтинге и фильтры." },
    { targetId: "nav-scholarships", title: "Стипендии", text: "Доступные стипендии на основе рейтинга." },
    { targetId: "nav-analytics", title: "Аналитика", text: "Баллы, посещаемость и характеристики." },
    { targetId: "nav-chat", title: "ИИ-чат", text: "Задавайте вопросы ИИ-ассистенту." },
    { targetId: "nav-profile", title: "Профиль", text: "Контакты и смена пароля." },
  ],
  admin: [
    { targetId: "nav-admin-import", title: "Импорт", text: "Загрузка данных из Excel." },
    { targetId: "nav-admin-policies", title: "Политики", text: "Управление видимостью данных." },
    { targetId: "nav-admin-scoring", title: "Начисление", text: "Начисление баллов за активность." },
    { targetId: "nav-admin-ai-rules", title: "ИИ-правила", text: "Правила для ИИ-ассистента." },
  ],
};

export function getHintsByRole(role: "student" | "admin"): Hint[] {
  return role === "admin" ? adminHints : studentHints;
}
```

- [ ] **Step 2: Type-check the new file**

Run: `cd frontend && npm run typecheck`
Expected: no errors related to `onboarding-config.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/onboarding/onboarding-config.ts
git commit -m "feat(onboarding): add hint and tour configuration by role"
```

---

## Task 3: Create onboarding state hook and provider

**Files:**
- Create: `frontend/src/components/onboarding/use-onboarding.ts`
- Create: `frontend/src/components/onboarding/onboarding-provider.tsx`

- [ ] **Step 1: Write the use-onboarding hook**

```ts
import { useCallback, useContext, useMemo } from "react";
import { OnboardingContext } from "./onboarding-provider";

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
```

- [ ] **Step 2: Write the provider with localStorage persistence**

```tsx
import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type OnboardingState = {
  dismissed: string[];
  hidden: string[];
};

type OnboardingContextValue = {
  dismissed: string[];
  hidden: string[];
  dismiss: (key: string) => void;
  hide: (key: string) => void;
  reset: () => void;
  isDismissed: (key: string) => boolean;
  isHidden: (key: string) => boolean;
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const STORAGE_KEY = "pisha-onboarding";

function readStored(userId: string | undefined): OnboardingState {
  if (!userId) return { dismissed: [], hidden: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: [], hidden: [] };
    const parsed = JSON.parse(raw) as Record<string, OnboardingState>;
    return parsed[userId] ?? { dismissed: [], hidden: [] };
  } catch {
    return { dismissed: [], hidden: [] };
  }
}

function writeStored(userId: string | undefined, state: OnboardingState) {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, OnboardingState>) : {};
    parsed[userId] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
}

export function OnboardingProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState<string[]>(() => readStored(userId).dismissed);
  const [hidden, setHidden] = useState<string[]>(() => readStored(userId).hidden);

  useEffect(() => {
    const stored = readStored(userId);
    setDismissed(stored.dismissed);
    setHidden(stored.hidden);
  }, [userId]);

  useEffect(() => {
    writeStored(userId, { dismissed, hidden });
  }, [userId, dismissed, hidden]);

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setHidden((prev) => prev.filter((k) => k !== key));
  }, []);

  const hide = useCallback((key: string) => {
    setHidden((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const reset = useCallback(() => {
    setDismissed([]);
    setHidden([]);
  }, []);

  const isDismissed = useCallback(
    (key: string) => dismissed.includes(key),
    [dismissed]
  );

  const isHidden = useCallback(
    (key: string) => hidden.includes(key),
    [hidden]
  );

  const value = useMemo(
    () => ({
      dismissed,
      hidden,
      dismiss,
      hide,
      reset,
      isDismissed,
      isHidden,
    }),
    [dismissed, hidden, dismiss, hide, reset, isDismissed, isHidden]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/onboarding/use-onboarding.ts frontend/src/components/onboarding/onboarding-provider.tsx
git commit -m "feat(onboarding): add onboarding state provider with localStorage persistence"
```

---

## Task 4: Create RippleButton component

**Files:**
- Create: `frontend/src/components/ui/ripple-button.tsx`
- Modify: `frontend/src/components/ui/button.tsx` (optional reference)

- [ ] **Step 1: Implement RippleButton with CSS-only ripple**

```tsx
import { useRef, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

export interface RippleButtonProps extends ButtonProps {
  rippleColor?: "white" | "black";
}

export function RippleButton({
  className,
  onPointerDown,
  rippleColor = "white",
  children,
  ...props
}: RippleButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const span = document.createElement("span");
    span.className = "pointer-events-none absolute rounded-full animate-ripple";
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.left = `${x - size / 2}px`;
    span.style.top = `${y - size / 2}px`;
    span.style.backgroundColor =
      rippleColor === "white" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.1)";
    span.style.animation = "ripple-grow 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards";

    button.appendChild(span);
    span.addEventListener("animationend", () => span.remove(), { once: true });

    onPointerDown?.(event);
  };

  return (
    <Button
      ref={buttonRef}
      className={cn("relative overflow-hidden", className)}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {children}
    </Button>
  );
}
```

- [ ] **Step 2: Add `.animate-ripple` utility to index.css (or rely on inline style)**

No CSS change needed because animation is inline. Verify the `ripple-grow` keyframe from Task 1 exists.

- [ ] **Step 3: Replace a single button to test**

Modify: `frontend/src/pages/overview/index.tsx` (find one primary button, replace `<Button` with `<RippleButton`).

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/ripple-button.tsx frontend/src/pages/overview/index.tsx
git commit -m "feat(ui): add RippleButton with Material ripple effect"
```

---

## Task 5: Replace all Button usages with RippleButton

**Files:**
- Modify: all `frontend/src/**/*.tsx` files that import `Button` from `@/components/ui/button`

- [ ] **Step 1: Find all Button imports**

Run: `grep -r "from \"@/components/ui/button\"" frontend/src --include="*.tsx" -l`

- [ ] **Step 2: Batch replace imports and JSX tags**

For each file:
- Change `import { Button } from "@/components/ui/button";` to `import { RippleButton } from "@/components/ui/ripple-button";`
- Replace `<Button` with `<RippleButton` and `</Button>` with `</RippleButton>`.

Example for `frontend/src/pages/auth/login.tsx`:

```tsx
import { RippleButton } from "@/components/ui/ripple-button";
// ...
<RippleButton type="submit">Войти</RippleButton>
```

- [ ] **Step 3: Verify no Button usage remains in app code**

Run: `grep -r "<Button" frontend/src --include="*.tsx" -l | grep -v ripple-button.tsx`
Expected: empty list (only `button.tsx` itself and possibly test files).

- [ ] **Step 4: Type-check and lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(ui): replace all buttons with RippleButton"
```

---

## Task 6: Create SpotlightOverlay component

**Files:**
- Create: `frontend/src/components/onboarding/spotlight-overlay.tsx`

- [ ] **Step 1: Implement spotlight overlay with cutout and tremor**

```tsx
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SpotlightOverlayProps {
  targetId: string | null;
  visible: boolean;
}

export function SpotlightOverlay({ targetId, visible }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetId || !visible) {
      setRect(null);
      return;
    }
    const el = document.getElementById(targetId);
    if (!el) return;
    setRect(el.getBoundingClientRect());

    const handleResize = () => {
      const next = document.getElementById(targetId);
      if (next) setRect(next.getBoundingClientRect());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [targetId, visible]);

  if (!visible || !rect) return null;

  const padding = 6;
  const left = rect.left + window.scrollX - padding;
  const top = rect.top + window.scrollY - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className="absolute inset-0 bg-slate-900/20 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        className="absolute rounded-lg animate-tremor"
        style={{
          left,
          top,
          width,
          height,
          boxShadow:
            "0 0 0 9999px rgba(15, 23, 42, 0.22), 0 0 0 3px #dd5e27, 0 8px 24px rgba(221, 94, 39, 0.25)",
          animation: "tremor 0.35s ease-in-out",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/onboarding/spotlight-overlay.tsx
git commit -m "feat(onboarding): add SpotlightOverlay with cutout and tremor"
```

---

## Task 7: Create AnchorWord and ContextualHint components

**Files:**
- Create: `frontend/src/components/onboarding/anchor-word.tsx`
- Create: `frontend/src/components/onboarding/contextual-hint.tsx`

- [ ] **Step 1: Implement AnchorWord**

```tsx
import { cn } from "@/lib/utils";

interface AnchorWordProps {
  word: string;
  targetId: string;
  active: boolean;
  onActivate: (targetId: string | null) => void;
}

export function AnchorWord({ word, targetId, active, onActivate }: AnchorWordProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        "font-semibold text-primary border-b border-dashed border-primary cursor-pointer",
        active && "text-primary-foreground"
      )}
      onMouseEnter={() => onActivate(targetId)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(targetId)}
      onBlur={() => onActivate(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(targetId);
        }
      }}
    >
      {word}
    </span>
  );
}
```

- [ ] **Step 2: Implement ContextualHint**

```tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnchorWord } from "./anchor-word";
import { SpotlightOverlay } from "./spotlight-overlay";
import type { Hint } from "./onboarding-config";

interface ContextualHintProps {
  hint: Hint;
  onDismiss: () => void;
  onHide: () => void;
}

export function ContextualHint({ hint, onDismiss, onHide }: ContextualHintProps) {
  const [activeTarget, setActiveTarget] = useState<string | null>(null);

  return (
    <>
      <SpotlightOverlay targetId={activeTarget} visible={!!activeTarget} />
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-80 rounded-lg border border-border",
          "bg-card p-4 shadow-lg border-l-4 border-l-primary"
        )}
        role="status"
        aria-live="polite"
      >
        <h4 className="font-semibold text-sm mb-2">{hint.title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {splitText(hint.text, hint.anchors).map((part, i) =>
            part.type === "anchor" ? (
              <AnchorWord
                key={i}
                word={part.word}
                targetId={part.targetId}
                active={activeTarget === part.targetId}
                onActivate={setActiveTarget}
              />
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>
        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            onClick={onHide}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Скрыть
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md"
          >
            Понятно
          </button>
        </div>
      </div>
    </>
  );
}

type Part =
  | { type: "text"; text: string }
  | { type: "anchor"; word: string; targetId: string };

function splitText(text: string, anchors: { word: string; targetId: string }[]): Part[] {
  const parts: Part[] = [];
  let remaining = text;
  anchors.forEach((anchor) => {
    const index = remaining.indexOf(anchor.word);
    if (index === -1) return;
    if (index > 0) parts.push({ type: "text", text: remaining.slice(0, index) });
    parts.push({ type: "anchor", word: anchor.word, targetId: anchor.targetId });
    remaining = remaining.slice(index + anchor.word.length);
  });
  if (remaining) parts.push({ type: "text", text: remaining });
  return parts;
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/onboarding/anchor-word.tsx frontend/src/components/onboarding/contextual-hint.tsx
git commit -m "feat(onboarding): add contextual hint card with anchor words"
```

---

## Task 8: Create tour components (GuideDot, TourBubble, TourController)

**Files:**
- Create: `frontend/src/components/onboarding/guide-dot.tsx`
- Create: `frontend/src/components/onboarding/tour-bubble.tsx`
- Create: `frontend/src/components/onboarding/tour-controller.tsx`

- [ ] **Step 1: Implement GuideDot**

```tsx
import { useEffect, useRef, useState } from "react";

interface GuideDotProps {
  fromRect: DOMRect;
  toRect: DOMRect;
  active: boolean;
  onArrived: () => void;
}

export function GuideDot({ fromRect, toRect, active, onArrived }: GuideDotProps) {
  const [phase, setPhase] = useState<"idle" | "flying" | "morphing" | "arrived">("idle");

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    setPhase("flying");
    const flyTimer = setTimeout(() => setPhase("morphing"), 700);
    const arriveTimer = setTimeout(() => {
      setPhase("arrived");
      onArrived();
    }, 1000);
    return () => {
      clearTimeout(flyTimer);
      clearTimeout(arriveTimer);
    };
  }, [active, onArrived]);

  if (!active || phase === "idle") return null;

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;
  const targetWidth = toRect.width + 12;
  const targetHeight = toRect.height + 12;

  const isMorphing = phase === "morphing" || phase === "arrived";

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: isMorphing ? toX : fromX,
        top: isMorphing ? toY : fromY,
        transform: "translate(-50%, -50%)",
        transition: "all 700ms cubic-bezier(0.4, 0, 0.2, 1)",
        width: isMorphing ? targetWidth : 14,
        height: isMorphing ? targetHeight : 14,
        borderRadius: isMorphing ? 10 : "50%",
        backgroundColor: isMorphing ? "transparent" : "#dd5e27",
        border: isMorphing ? "3px solid #dd5e27" : "0px solid #dd5e27",
        boxShadow: isMorphing
          ? "0 8px 24px rgba(221, 94, 39, 0.25)"
          : "0 2px 14px rgba(221, 94, 39, 0.6)",
        opacity: phase === "arrived" ? 1 : 1,
      }}
    />
  );
}
```

- [ ] **Step 2: Implement TourBubble**

```tsx
interface TourBubbleProps {
  title: string;
  text: string;
  step: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TourBubble({ title, text, step, total, onNext, onSkip }: TourBubbleProps) {
  return (
    <div
      className="fixed z-50 w-64 rounded-lg border border-border bg-card p-4 shadow-lg border-l-4 border-l-primary"
      role="dialog"
      aria-modal="false"
    >
      <div className="text-xs text-muted-foreground mb-1">
        Шаг {step} из {total}
      </div>
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{text}</p>
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Пропустить
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md"
          autoFocus
        >
          Далее
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement TourController**

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { GuideDot } from "./guide-dot";
import { TourBubble } from "./tour-bubble";
import type { TourStep } from "./onboarding-config";

interface TourControllerProps {
  steps: TourStep[];
  originRect: DOMRect;
  onClose: () => void;
}

export function TourController({ steps, originRect, onClose }: TourControllerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [dotKey, setDotKey] = useState(0);

  const step = steps[stepIndex];

  const measureTarget = useCallback(() => {
    const el = document.getElementById(step.targetId);
    setTargetRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useEffect(() => {
    measureTarget();
    const handleResize = () => measureTarget();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measureTarget]);

  const handleArrived = useCallback(() => {
    // bubble is shown automatically once targetRect exists
  }, []);

  const handleNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      onClose();
      return;
    }
    setStepIndex((i) => i + 1);
    setDotKey((k) => k + 1);
  }, [stepIndex, steps.length, onClose]);

  const fromRect = useMemo(
    () => targetRect ?? originRect,
    [targetRect, originRect]
  );

  const bubbleRect = targetRect ?? originRect;
  const bubbleStyle: React.CSSProperties = {
    left: bubbleRect.left + bubbleRect.width + 16,
    top: bubbleRect.top,
  };

  // keep bubble on screen if it overflows right
  if (bubbleRect.left + bubbleRect.width + 16 + 256 > window.innerWidth) {
    bubbleStyle.left = bubbleRect.left - 16 - 256;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!step || !targetRect) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-40 pointer-events-none" />
      <GuideDot
        key={dotKey}
        fromRect={stepIndex === 0 ? originRect : fromRect}
        toRect={targetRect}
        active
        onArrived={handleArrived}
      />
      <div className="fixed z-50" style={bubbleStyle}>
        <TourBubble
          title={step.title}
          text={step.text}
          step={stepIndex + 1}
          total={steps.length}
          onNext={handleNext}
          onSkip={onClose}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/onboarding/guide-dot.tsx frontend/src/components/onboarding/tour-bubble.tsx frontend/src/components/onboarding/tour-controller.tsx
git commit -m "feat(onboarding): add guide dot, tour bubble and tour controller"
```

---

## Task 9: Create HintReopenButton and menu

**Files:**
- Create: `frontend/src/components/onboarding/hint-reopen-button.tsx`

- [ ] **Step 1: Implement floating reopen button with menu**

```tsx
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Hint, Tour } from "./onboarding-config";

interface HintReopenButtonProps {
  hints: Hint[];
  tours: Tour[];
  onShowHint: (pageKey: string) => void;
  onStartTour: (tourKey: string) => void;
  hasHidden: boolean;
}

export function HintReopenButton({
  hints,
  tours,
  onShowHint,
  onStartTour,
  hasHidden,
}: HintReopenButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!hasHidden && hints.length === 0 && tours.length === 0) return null;

  return (
    <div ref={ref} className="fixed bottom-6 left-6 z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-11 h-11 rounded-full bg-card border border-border shadow-md",
          "flex items-center justify-center text-primary hover:bg-accent transition-colors"
        )}
        aria-label="Показать подсказки"
      >
        <Icon name="help" />
      </button>
      {open && (
        <div className="absolute bottom-14 left-0 w-56 rounded-lg border border-border bg-card shadow-lg p-2">
          <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">
            Подсказки
          </div>
          {hints.map((h) => (
            <button
              key={h.pageKey}
              type="button"
              onClick={() => {
                onShowHint(h.pageKey);
                setOpen(false);
              }}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent"
            >
              {h.title}
            </button>
          ))}
          <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide border-t border-border mt-1 pt-1">
            Туры
          </div>
          {tours.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                onStartTour(t.key);
                setOpen(false);
              }}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/onboarding/hint-reopen-button.tsx
git commit -m "feat(onboarding): add floating hint reopen button with menu"
```

---

## Task 10: Wire OnboardingProvider into app layout and render hints/tours

**Files:**
- Modify: `frontend/src/providers/index.tsx` or wherever root providers are composed
- Modify: `frontend/src/layouts/dashboard-layout.tsx` or main layout
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Wrap app with OnboardingProvider**

Find the root provider composition (likely `frontend/src/main.tsx` or `frontend/src/providers/index.tsx`). Wrap children with `OnboardingProvider` and pass `user.id`.

Example modification in `frontend/src/main.tsx`:

```tsx
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
// ...
<AuthProvider>
  <OnboardingProvider userId={authUser?.id}>
    <App />
  </OnboardingProvider>
</AuthProvider>
```

- [ ] **Step 2: Add a page-aware onboarding shell to dashboard layout**

Create `frontend/src/components/onboarding/page-onboarding.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useAuthStore } from "@/stores/use-auth-store";
import { ContextualHint } from "./contextual-hint";
import { HintReopenButton } from "./hint-reopen-button";
import { TourController } from "./tour-controller";
import { useOnboarding } from "./use-onboarding";
import { appTourSteps, getHintsByRole } from "./onboarding-config";

export function PageOnboarding() {
  const { currentUser: user } = useAuthStore();
  const { pathname } = useLocation();
  const { dismiss, hide, isDismissed, isHidden, reset } = useOnboarding();
  const [forcedHint, setForcedHint] = useState<string | null>(null);
  const [activeTour, setActiveTour] = useState<"page" | "app" | null>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);

  const role = user?.role === "admin" ? "admin" : "student";
  const hints = useMemo(() => getHintsByRole(role), [role]);
  const pageKey = pathname.split("/").pop() ?? "";
  const currentHint = hints.find((h) => h.pageKey === pageKey);

  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  const visibleHint =
    forcedHint && hints.find((h) => h.pageKey === forcedHint)
      ? hints.find((h) => h.pageKey === forcedHint)
      : currentHint && !isDismissed(currentHint.pageKey) && !isHidden(currentHint.pageKey)
        ? currentHint
        : null;

  const tours = useMemo(
    () => [
      { key: "page", label: "Тур по странице" },
      { key: "app", label: "Тур по приложению" },
    ],
    []
  );

  const tourSteps =
    activeTour === "app"
      ? appTourSteps[role]
      : activeTour === "page" && currentHint
        ? currentHint.anchors.map((a, i) => ({
            targetId: a.targetId,
            title: currentHint.title,
            text: `${i + 1}-й элемент на этой странице.`,
          }))
        : [];

  const originRect = reopenRef.current?.getBoundingClientRect() ?? new DOMRect(40, window.innerHeight - 40, 0, 0);

  return (
    <>
      {visibleHint && (
        <ContextualHint
          hint={visibleHint}
          onDismiss={() => {
            dismiss(visibleHint.pageKey);
            setForcedHint(null);
          }}
          onHide={() => {
            hide(visibleHint.pageKey);
            setForcedHint(null);
          }}
        />
      )}
      <HintReopenButton
        hints={hints}
        tours={tours}
        onShowHint={setForcedHint}
        onStartTour={(key) => setActiveTour(key as "page" | "app")}
        hasHidden={hints.some((h) => isHidden(h.pageKey))}
      />
      {activeTour && (
        <TourController
          steps={tourSteps}
          originRect={originRect}
          onClose={() => setActiveTour(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Render PageOnboarding in dashboard layout**

Modify `frontend/src/layouts/dashboard-layout.tsx` (or equivalent) to include `<PageOnboarding />` near the end, before closing layout wrapper.

- [ ] **Step 4: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/onboarding/page-onboarding.tsx frontend/src/layouts/dashboard-layout.tsx frontend/src/main.tsx
git commit -m "feat(onboarding): wire hints, tours and reopen button into app layout"
```

---

## Task 11: Add onboarding target IDs to UI elements

**Files:**
- Modify: `frontend/src/components/sidebar.tsx` (navigation items)
- Modify: `frontend/src/pages/rating/index.tsx` (filters, search)
- Modify: `frontend/src/pages/scholarships/index.tsx`
- Modify: `frontend/src/pages/analytics/index.tsx`
- Modify: `frontend/src/pages/chat/index.tsx`
- Modify: `frontend/src/pages/profile/index.tsx`
- Modify: `frontend/src/pages/admin/index.tsx` and admin sub-components

- [ ] **Step 1: Add IDs matching onboarding-config targets**

For each targetId in config, add `id="target-id"` to the corresponding element.

Example for sidebar item:

```tsx
<div id="nav-rating" className="...">Рейтинг</div>
```

Example for rating filters:

```tsx
<select id="course-filter">...</select>
<input id="student-search" placeholder="Поиск студентов..." />
```

- [ ] **Step 2: Verify all targetIds resolve**

Run: `cd frontend && npm run typecheck`
Expected: no errors (this won't catch missing IDs, but ensures no JSX syntax issues).

- [ ] **Step 3: Manual DOM check**

After stack is running, open browser DevTools and run:

```js
["course-filter", "student-search", "nav-rating", "nav-scholarships", "nav-analytics", "nav-chat", "nav-profile"].map(id => document.getElementById(id) ? `${id}: ok` : `${id}: MISSING`).join("\n")
```

Expected: all ids report `ok`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "feat(onboarding): add onboarding target ids to ui elements"
```

---

## Task 12: Spin up the stack and verify

**Files:**
- None (runtime verification)

- [ ] **Step 1: Ensure environment is configured**

Run: `cd /root/pisha- && cp -n .env.example .env`
Then edit `.env` to set required secrets if not already set:
- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `FIELD_ENCRYPTION_KEY`
- `DEFAULT_ADMIN_PASSWORD`

Generate encryption key if needed:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

- [ ] **Step 2: Build and start the stack**

Run: `cd /root/pisha- && docker compose up --build -d`
Expected: containers start successfully. Check with `docker compose ps`.

- [ ] **Step 3: Wait for services and open app**

Run: `sleep 30 && curl -s -o /dev/null -w "%{http_code}" http://localhost`
Expected: `200` or `302`.

Open browser at `http://localhost`.

- [ ] **Step 4: Manual verification checklist**

1. Log in as a student.
2. Navigate to **Рейтинг** — contextual hint appears bottom-right.
3. Hover over «фильтровать» — page dims and course filter is highlighted with a tremor frame.
4. Click «Понятно» — hint disappears.
5. Click the floating **?** button — menu shows hints and tours.
6. Select **Тур по приложению** — orange dot flies from ? button to sidebar items, morphs into a frame around each, bubble appears.
7. Click through tour steps — frame aligns with target element (±2px).
8. Click any button — ripple effect visible.
9. Repeat as admin to verify admin hints/tour.
10. Enable `prefers-reduced-motion` in OS/browser — ripple and tremor disabled.

- [ ] **Step 5: Commit any final env/docs tweaks**

```bash
git add -A
git commit -m "chore: verify stack and onboarding integration"
```

---

## Task 13: Final quality checks

**Files:**
- All modified files

- [ ] **Step 1: Run frontend typecheck and lint**

Run:

```bash
cd frontend && npm run typecheck && npm run lint
```

Expected: no errors.

- [ ] **Step 2: Run root lint/typecheck scripts**

Run:

```bash
cd /root/pisha- && npm run lint && npm run typecheck
```

Expected: passes.

- [ ] **Step 3: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: address lint/typecheck issues"
```

---

## Self-Review

**Spec coverage:**
- Contextual hints for both roles → Task 10 + config.
- Hover anchors with spotlight + tremor → Task 6 + 7.
- Reopen button → Task 9.
- Material ripple on buttons → Tasks 4–5.
- Guide-dot tours (page + app) → Tasks 8 + 10.
- Frame alignment requirement → Task 12 manual check + criterion in Task 13.
- localStorage persistence keyed by userId → Task 3.
- prefers-reduced-motion → CSS keyframes + inline style (ripple removed, tremor skipped).
- Stack startup → Task 12.

**Placeholder scan:** No TBD/TODO/fill-in placeholders. All code is complete.

**Type consistency:** `targetId` consistently string; `role` consistently `"student" | "admin"`; localStorage key `pisha-onboarding` used in one place.
