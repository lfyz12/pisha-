# Frontend Integration for Pisha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести фронтенд Pisha с моковых данных и браузерного парсинга Excel на реальные вызовы Django-бэкенда. Удалить `use-mock-data-store.ts`, `parse-rating-excel.ts`, `import-excel.ts` и зависимость `xlsx`.

**Architecture:** Фронтенд остаётся на React + Vite + TanStack Query + Zustand. Все данные приходят с бэкенда по префиксу `/api`. Браузерный парсинг Excel заменяется загрузкой файла через `multipart/form-data` на `POST /api/import/excel`; бэкенд парсит, сохраняет в PostgreSQL и возвращает сводку. Авторизация — JWT, токен сохраняется в `localStorage` под ключом `auth-token` (читается `apiClient`). Адрес API задаётся через `VITE_API_BASE_URL=/api`, dev-прокси в Vite перенаправляет `/api` на `http://localhost:8000`.

**Tech Stack:** React 19, Vite 8, TanStack Query 5, Zustand 5, axios, TypeScript 6. Backend-контракт описан в `docs/superpowers/plans/2026-07-11-backend-for-pisha.md`.

---

## File Structure

### New frontend files

| File | Responsibility |
|------|----------------|
| `frontend/src/services/import.ts` | Загрузка Excel на бэкенд (`uploadExcel`). |
| `frontend/src/hooks/server/use-import.ts` | Мутация `useUploadExcel` с инвалидацией кэша. |
| `frontend/src/hooks/server/use-student-profile.ts` | Запрос профиля студента (`useStudentProfile`). |
| `frontend/src/hooks/server/use-rating-data.ts` | Композитный хук рейтинговых данных. |

### Modified frontend files

| File | Change |
|------|--------|
| `frontend/src/types/domain.ts` | Добавить `StudentStatus` и поле `status` в `Student`; добавить `StudentProfile`. |
| `frontend/src/services/students.ts` | Добавить `updateStudentStatus`, `getStudentProfile`. |
| `frontend/src/services/notification.ts` | Реальные запросы к `/notifications`. |
| `frontend/src/services/scholarship-service.ts` | Реальный запрос к `/scholarships`. |
| `frontend/src/services/index.ts` | Экспорт новых функций. |
| `frontend/src/hooks/server/use-students.ts` | Добавить `useUpdateStudentStatus`. |
| `frontend/src/hooks/server/index.ts` | Экспорт новых хуков. |
| `frontend/src/hooks/index.ts` | Экспорт новых хуков. |
| `frontend/src/stores/use-auth-store.ts` | Асинхронный вход через `/auth/login`, сохранение токена. |
| `frontend/src/stores/use-notification-store.ts` | Распаковка `ApiResponse.data`. |
| `frontend/src/stores/use-scholarship-store.ts` | Распаковка `ApiResponse.data`. |
| `frontend/src/stores/index.ts` | Убрать `useMockDataStore` и `MOCK_ACCOUNTS`. |
| `frontend/src/pages/auth/login/index.tsx` | Бэкенд-авторизация, удалить быстрый список студентов. |
| `frontend/src/pages/rating/index.tsx` | Загрузка через `useUploadExcel`, удалить парсинг в браузере. |
| `frontend/src/pages/admin/index.tsx` | Загрузка через `useUploadExcel`, сводка импорта. |
| `frontend/src/pages/dashboard/index.tsx` | Только бэкенд-метрики, без мок-фоллбека. |
| `frontend/src/pages/dashboard/components/student-table.tsx` | Колонка статуса с селектом, мутация обновления. |
| `frontend/src/pages/dashboard/components/scoring-form.tsx` | Только бэкенд-студенты. |
| `frontend/src/pages/analytics/index.tsx` | `useRatingData` + `useStudentProfile`. |
| `frontend/src/pages/profile/index.tsx` | `useRatingData` вместо мок-хранилища. |
| `frontend/src/pages/scholarships/index.tsx` | `useRatingTable` для текущего студента. |
| `frontend/src/pages/overview/index.tsx` | `useRatingData` + `useStudentProfile`. |
| `frontend/package.json` | Удалить `xlsx` из зависимостей. |

### Deleted frontend files

| File | Reason |
|------|--------|
| `frontend/src/stores/use-mock-data-store.ts` | Логика перенесена в бэкенд. |
| `frontend/src/lib/parse-rating-excel.ts` | Парсинг перенесён в бэкенд. |
| `frontend/src/lib/import-excel.ts` | Импорт перенесён в бэкенд. |

---

## Phase 1: Types and services

### Task 1.1: Update domain types

**Files:**
- Modify: `frontend/src/types/domain.ts`

- [ ] **Step 1: Replace contents of `frontend/src/types/domain.ts`**

```typescript
export type StudentStatus = "active" | "at_risk" | "top_reserve" | "expelled";

export interface Student {
  id: string;
  name: string;
  initials: string;
  studentId: string;
  course: number;
  rating: number;
  status: StudentStatus;
  groupName?: string;
}

export interface StudentAttendance {
  weekIndex: number;
  value: number;
}

export interface StudentActivity {
  category: "science" | "project" | "extracurricular";
  name: string;
  points: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  initials: string;
  studentId: string;
  course: number;
  groupName: string;
  rating: number;
  status: StudentStatus;
  totalScore: number;
  averageScore: number;
  attendances: StudentAttendance[];
  activities: StudentActivity[];
  projectCount: number;
  attendancePct: number;
}

export interface DashboardMetrics {
  totalStudents: number;
  totalStudentsChange: number;
  averageGpa: number;
  attendance: number;
  projects: number;
  newRequests: number;
}

export interface GpaBarData {
  label: string;
  value: number;
}

export interface AttendanceTrend {
  month: string;
  value: number;
}

export interface ScoringLog {
  id: string;
  activityType: string;
  points: number;
  createdAt: string;
}

export interface AIRule {
  id: string;
  conditions: string[];
  actions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ScoringPayload {
  activityType: string;
  points: number;
  participantCount: number;
  studentIds: string[];
}

export interface ServerMetrics {
  cpuLoad: number;
  ramUsage: number;
  gpuUsage: number;
  status: "online" | "offline" | "warning";
  location: string;
}

export interface RatingStudent {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  course: number;
  group: string;
  academicScore: number;
  activityScore: number;
  totalScore: number;
  trend: "up" | "down" | "stable";
  trendValue?: number;
  isCurrentUser?: boolean;
}

export interface RatingStats {
  myPlace: number;
  myPlaceChange: number;
  topScore: number;
  averageScore: number;
  activityLevel: "Высокая" | "Средняя" | "Низкая";
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  logo?: string;
  description: string;
  tags: string[];
  amount: number;
  currency: string;
  period: string;
  matchPercent: number;
  minRating?: number;
  isAvailable: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface ScholarshipFilter {
  query?: string;
  minMatch?: number;
  tags?: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  initials: string;
  groupName: string;
  role: "student" | "admin";
  avatarUrl?: string;
}
```

- [ ] **Step 2: Update `frontend/src/types/index.ts` barrel export**

Replace the `from "./domain"` export block with:

```typescript
export type {
  Student,
  StudentStatus,
  StudentProfile,
  StudentAttendance,
  StudentActivity,
  DashboardMetrics,
  GpaBarData,
  AttendanceTrend,
  ScoringLog,
  AIRule,
  ScoringPayload,
  ServerMetrics,
  RatingStudent,
  RatingStats,
  Scholarship,
  ChatMessage,
  ScholarshipFilter,
  Notification,
  UserAccount,
} from "./domain";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/domain.ts frontend/src/types/index.ts
git commit -m "feat(types): add StudentStatus and StudentProfile"
```

---

### Task 1.2: Create import service

**Files:**
- Create: `frontend/src/services/import.ts`

- [ ] **Step 1: Write `frontend/src/services/import.ts`**

```typescript
import type { ApiResponse } from "@/types";
import { apiClient } from "@/lib/api-client";

export interface ImportSummary {
  studentsImported: number;
  eventsImported: number;
}

interface ImportSummaryRaw {
  students_imported: number;
  events_imported: number;
}

export async function uploadExcel(
  file: File,
  parser?: "auto" | "multi" | "flat"
): Promise<ApiResponse<ImportSummary>> {
  const formData = new FormData();
  formData.append("file", file);
  if (parser) {
    formData.append("parser", parser);
  }

  const { data } = await apiClient.post<ApiResponse<ImportSummaryRaw>>("/import/excel", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return {
    ...data,
    data: {
      studentsImported: data.data.students_imported,
      eventsImported: data.data.events_imported,
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/import.ts
git commit -m "feat(services): add uploadExcel service"
```

---

### Task 1.3: Extend students service

**Files:**
- Modify: `frontend/src/services/students.ts`

- [ ] **Step 1: Replace contents of `frontend/src/services/students.ts`**

```typescript
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";
import type { Student, StudentActivity, StudentProfile, StudentStatus } from "@/types";
import { apiClient } from "@/lib/api-client";

function mapStudent(raw: Record<string, unknown>): Student {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    initials: String(raw.initials ?? ""),
    studentId: String(raw.student_id ?? raw.studentId ?? ""),
    course: Number(raw.course ?? 0),
    rating: Number(raw.rating ?? 0),
    status: (raw.status as StudentStatus) ?? "active",
    groupName: raw.group_name ? String(raw.group_name) : undefined,
  };
}

function mapProfile(raw: Record<string, unknown>): StudentProfile {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    initials: String(raw.initials ?? ""),
    studentId: String(raw.student_id ?? raw.studentId ?? ""),
    course: Number(raw.course ?? 0),
    groupName: String(raw.group_name ?? raw.groupName ?? ""),
    rating: Number(raw.rating ?? 0),
    status: (raw.status as StudentStatus) ?? "active",
    totalScore: Number(raw.total_score ?? raw.totalScore ?? 0),
    averageScore: Number(raw.average_score ?? raw.averageScore ?? 0),
    attendances: Array.isArray(raw.attendances)
      ? raw.attendances.map((a: Record<string, unknown>) => ({
          weekIndex: Number(a.week_index ?? a.weekIndex ?? 0),
          value: Number(a.value ?? 0),
        }))
      : [],
    activities: Array.isArray(raw.activities)
      ? raw.activities.map((a: Record<string, unknown>) => ({
          category: String(a.category ?? "") as StudentActivity["category"],
          name: String(a.name ?? ""),
          points: Number(a.points ?? 0),
        }))
      : [],
    projectCount: Number(raw.project_count ?? raw.projectCount ?? 0),
    attendancePct: Number(raw.attendance_pct ?? raw.attendancePct ?? 0),
  };
}

export async function getStudents(params?: PaginationParams): Promise<PaginatedResponse<Student>> {
  const { data } = await apiClient.get<PaginatedResponse<Student>>("/students", { params });
  return {
    ...data,
    data: data.data.map(mapStudent),
  };
}

export async function getStudent(id: string): Promise<ApiResponse<StudentProfile>> {
  const { data } = await apiClient.get<ApiResponse<StudentProfile>>(`/students/${id}`);
  return { ...data, data: mapProfile(data.data) };
}

export async function getStudentProfile(id: string): Promise<ApiResponse<StudentProfile>> {
  const { data } = await apiClient.get<ApiResponse<StudentProfile>>(`/students/${id}/profile`);
  return { ...data, data: mapProfile(data.data) };
}

export async function updateStudentRating(
  id: string,
  rating: number
): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.patch<ApiResponse<Student>>(`/students/${id}`, { rating });
  return { ...data, data: mapStudent(data.data) };
}

export async function updateStudentStatus(
  id: string,
  status: StudentStatus
): Promise<ApiResponse<Student>> {
  const { data } = await apiClient.patch<ApiResponse<Student>>(`/students/${id}`, { status });
  return { ...data, data: mapStudent(data.data) };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/students.ts
git commit -m "feat(services): add profile and status update helpers"
```

---

### Task 1.4: Replace notification mocks with API calls

**Files:**
- Modify: `frontend/src/services/notification.ts`

- [ ] **Step 1: Replace contents of `frontend/src/services/notification.ts`**

```typescript
import type { ApiResponse } from "@/types";
import type { Notification } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function fetchNotifications(): Promise<ApiResponse<Notification[]>> {
  const { data } = await apiClient.get<ApiResponse<Notification[]>>("/notifications");
  return data;
}

export async function markAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
  const { data } = await apiClient.patch<ApiResponse<Notification>>(
    `/notifications/${notificationId}/read`
  );
  return data;
}

export async function markAllAsRead(): Promise<ApiResponse<null>> {
  const { data } = await apiClient.post<ApiResponse<null>>("/notifications/mark-all-read");
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/notification.ts
git commit -m "feat(services): replace notification mocks with api calls"
```

---

### Task 1.5: Replace scholarship mocks with API call

**Files:**
- Modify: `frontend/src/services/scholarship-service.ts`

- [ ] **Step 1: Replace contents of `frontend/src/services/scholarship-service.ts`**

```typescript
import type { ApiResponse } from "@/types";
import type { ScholarshipOffer } from "@/types";
import { apiClient } from "@/lib/api-client";

export async function fetchScholarshipOffers(): Promise<ApiResponse<ScholarshipOffer[]>> {
  const { data } = await apiClient.get<ApiResponse<ScholarshipOffer[]>>("/scholarships");
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/scholarship-service.ts
git commit -m "feat(services): replace scholarship mocks with api call"
```

---

### Task 1.6: Update services barrel export

**Files:**
- Modify: `frontend/src/services/index.ts`

- [ ] **Step 1: Replace contents of `frontend/src/services/index.ts`**

```typescript
export {
  getStudents,
  getStudent,
  getStudentProfile,
  updateStudentRating,
  updateStudentStatus,
} from "./students";
export { getDashboardMetrics, getGpaDistribution, getAttendanceTrends } from "./dashboard";
export { getScoringLogs, createScoring } from "./scoring";
export { getAIRules, createAIRule } from "./ai-rules";
export { getServerMetrics } from "./server";
export { getRatingTable } from "./rating";
export { getScholarships } from "./scholarships";
export { sendChatMessage, checkHealth, createChatMessage } from "./chat";
export { fetchNotifications, markAsRead, markAllAsRead } from "./notification";
export { fetchScholarshipOffers } from "./scholarship-service";
export { uploadExcel } from "./import";
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/index.ts
git commit -m "feat(services): export new service functions"
```

---

## Phase 2: Hooks

### Task 2.1: Add useUploadExcel mutation hook

**Files:**
- Create: `frontend/src/hooks/server/use-import.ts`

- [ ] **Step 1: Write `frontend/src/hooks/server/use-import.ts`**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadExcel } from "@/services/import";
import type { ApiResponse, ImportSummary } from "@/types";

const IMPORT_KEYS = {
  all: ["import"] as const,
};

const RATING_KEYS = {
  all: ["rating"] as const,
};

const DASHBOARD_KEYS = {
  all: ["dashboard"] as const,
};

const STUDENT_KEYS = {
  all: ["students"] as const,
};

export function useUploadExcel() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<ImportSummary>, Error, { file: File; parser?: "auto" | "multi" | "flat" }>({
    mutationFn: ({ file, parser }) => uploadExcel(file, parser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RATING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: IMPORT_KEYS.all });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/server/use-import.ts
git commit -m "feat(hooks): add useUploadExcel mutation"
```

---

### Task 2.2: Add useStudentProfile query hook

**Files:**
- Create: `frontend/src/hooks/server/use-student-profile.ts`

- [ ] **Step 1: Write `frontend/src/hooks/server/use-student-profile.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getStudentProfile } from "@/services/students";
import type { ApiResponse, StudentProfile } from "@/types";

const STUDENT_PROFILE_KEYS = {
  all: ["student-profile"] as const,
  detail: (id: string) => [...STUDENT_PROFILE_KEYS.all, id] as const,
};

export function useStudentProfile(id: string | null | undefined) {
  return useQuery<ApiResponse<StudentProfile>, Error>({
    queryKey: STUDENT_PROFILE_KEYS.detail(id ?? ""),
    queryFn: () => getStudentProfile(id!),
    enabled: Boolean(id),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/server/use-student-profile.ts
git commit -m "feat(hooks): add useStudentProfile query"
```

---

### Task 2.3: Add useRatingData composite hook

**Files:**
- Create: `frontend/src/hooks/server/use-rating-data.ts`

- [ ] **Step 1: Write `frontend/src/hooks/server/use-rating-data.ts`**

```typescript
import { useRatingTable } from "./use-rating";
import { useDashboardMetrics } from "./use-dashboard";
import { useGpaDistribution } from "./use-dashboard";
import { useAttendanceTrends } from "./use-dashboard";

export function useRatingData(course?: number, search?: string) {
  const rating = useRatingTable(course, search);
  const metrics = useDashboardMetrics();
  const gpa = useGpaDistribution();
  const attendance = useAttendanceTrends();

  return {
    rating,
    metrics,
    gpa,
    attendance,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/server/use-rating-data.ts
git commit -m "feat(hooks): add useRatingData composite hook"
```

---

### Task 2.4: Add useUpdateStudentStatus mutation

**Files:**
- Modify: `frontend/src/hooks/server/use-students.ts`

- [ ] **Step 1: Replace contents of `frontend/src/hooks/server/use-students.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents, updateStudentRating, updateStudentStatus } from "@/services/students";
import type { PaginatedResponse, Student, PaginationParams, StudentStatus } from "@/types";

const STUDENT_KEYS = {
  all: ["students"] as const,
  lists: () => [...STUDENT_KEYS.all, "list"] as const,
  list: (params?: PaginationParams) => [...STUDENT_KEYS.lists(), params] as const,
  details: () => [...STUDENT_KEYS.all, "detail"] as const,
  detail: (id: string) => [...STUDENT_KEYS.details(), id] as const,
  profile: (id: string) => [...STUDENT_KEYS.all, "profile", id] as const,
};

export function useStudents(params?: PaginationParams) {
  return useQuery<PaginatedResponse<Student>, Error>({
    queryKey: STUDENT_KEYS.list(params),
    queryFn: () => getStudents(params),
  });
}

export function useUpdateStudentRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => updateStudentRating(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
    },
  });
}

export function useUpdateStudentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StudentStatus }) => updateStudentStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.profile(variables.id) });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/server/use-students.ts
git commit -m "feat(hooks): add useUpdateStudentStatus mutation"
```

---

### Task 2.5: Update hooks barrel exports

**Files:**
- Modify: `frontend/src/hooks/server/index.ts`
- Modify: `frontend/src/hooks/index.ts`

- [ ] **Step 1: Replace contents of `frontend/src/hooks/server/index.ts`**

```typescript
export {
  useDashboardMetrics,
  useGpaDistribution,
  useAttendanceTrends,
} from "./use-dashboard";
export { useStudents, useUpdateStudentRating, useUpdateStudentStatus } from "./use-students";
export { useScoringLogs, useCreateScoring } from "./use-scoring";
export { useAIRules, useCreateAIRule } from "./use-ai-rules";
export { useServerMetrics } from "./use-server";
export { useRatingTable } from "./use-rating";
export { useScholarships } from "./use-scholarships";
export { useUploadExcel } from "./use-import";
export { useStudentProfile } from "./use-student-profile";
export { useRatingData } from "./use-rating-data";
```

- [ ] **Step 2: Replace contents of `frontend/src/hooks/index.ts`**

```typescript
export { useDebounce } from "./use-debounce";
export { useMediaQuery } from "./use-media-query";
export { useIsAdmin } from "./use-is-admin";
export {
  useDashboardMetrics,
  useGpaDistribution,
  useAttendanceTrends,
  useStudents,
  useUpdateStudentRating,
  useUpdateStudentStatus,
  useScoringLogs,
  useCreateScoring,
  useAIRules,
  useCreateAIRule,
  useServerMetrics,
  useRatingTable,
  useScholarships,
  useUploadExcel,
  useStudentProfile,
  useRatingData,
} from "./server";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/server/index.ts frontend/src/hooks/index.ts
git commit -m "feat(hooks): export new server hooks"
```

---

## Phase 3: Stores

### Task 3.1: Switch auth store to backend login

**Files:**
- Modify: `frontend/src/stores/use-auth-store.ts`

- [ ] **Step 1: Replace contents of `frontend/src/stores/use-auth-store.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import type { UserAccount } from "@/types";
import { apiClient } from "@/lib/api-client";

interface AuthState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (groupName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAs: (account: UserAccount) => void;
  logout: () => void;
}

interface LoginResponse {
  data: {
    token: string;
    user: UserAccount;
  };
  status: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (groupName, password) => {
        if (!groupName.trim() || !password) {
          return { success: false, error: "Введите логин и пароль" };
        }

        set({ isLoading: true });
        try {
          const { data } = await apiClient.post<LoginResponse>("/auth/login", {
            groupName: groupName.trim(),
            password,
          });

          localStorage.setItem("auth-token", data.data.token);
          set({
            currentUser: data.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          if (axios.isAxiosError(error) && error.response?.data?.message) {
            return { success: false, error: error.response.data.message };
          }
          return { success: false, error: "Ошибка входа" };
        }
      },

      loginAs: (account) => {
        set({ currentUser: account, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("auth-token");
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/use-auth-store.ts
git commit -m "feat(auth): switch auth store to backend jwt login"
```

---

### Task 3.2: Update notification store to unwrap ApiResponse

**Files:**
- Modify: `frontend/src/stores/use-notification-store.ts`

- [ ] **Step 1: Replace contents of `frontend/src/stores/use-notification-store.ts`**

```typescript
import { create } from "zustand";
import type { Notification } from "@/types";
import * as notificationService from "@/services/notification";

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  fetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    const response = await notificationService.fetchNotifications();
    set({ notifications: response.data, loading: false });
  },

  markAsRead: async (id) => {
    await notificationService.markAsRead(id);
    set({
      notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
  },

  markAllAsRead: async () => {
    await notificationService.markAllAsRead();
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    });
  },

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/use-notification-store.ts
git commit -m "feat(store): unwrap notification api response"
```

---

### Task 3.3: Update scholarship store to unwrap ApiResponse

**Files:**
- Modify: `frontend/src/stores/use-scholarship-store.ts`

- [ ] **Step 1: Replace contents of `frontend/src/stores/use-scholarship-store.ts`**

```typescript
import { create } from "zustand";
import type { ScholarshipOffer } from "@/types";
import { fetchScholarshipOffers } from "@/services/scholarship-service";

interface ScholarshipState {
  offers: ScholarshipOffer[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export const useScholarshipStore = create<ScholarshipState>((set) => ({
  offers: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetchScholarshipOffers();
      set({ offers: response.data, loading: false });
    } catch {
      set({ error: "Ошибка загрузки стипендий", loading: false });
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/use-scholarship-store.ts
git commit -m "feat(store): unwrap scholarship api response"
```

---

### Task 3.4: Update stores barrel export

**Files:**
- Modify: `frontend/src/stores/index.ts`

- [ ] **Step 1: Replace contents of `frontend/src/stores/index.ts`**

```typescript
export { useThemeStore } from "./use-theme-store";
export { useSidebarStore } from "./use-sidebar-store";
export { useModalStore } from "./use-modal-store";
export { useDrawerStore } from "./use-drawer-store";
export { useAuthStore } from "./use-auth-store";
export { useNotificationStore } from "./use-notification-store";
export { useScholarshipStore } from "./use-scholarship-store";
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/index.ts
git commit -m "feat(stores): remove mock data store export"
```

---

## Phase 4: Pages

### Task 4.1: Login page with backend auth

**Files:**
- Modify: `frontend/src/pages/auth/login/index.tsx`

- [ ] **Step 1: Replace contents of `frontend/src/pages/auth/login/index.tsx`**

```tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/stores";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!groupName.trim()) {
      setError("Введите логин");
      return;
    }
    if (!password.trim()) {
      setError("Введите пароль");
      return;
    }

    const result = await login(groupName.trim(), password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error ?? "Ошибка входа");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 md:px-8 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="engineering" fill className="text-on-primary text-3xl sm:text-4xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-text-main">УПИШ УрФУ</h1>
          <p className="text-sm sm:text-base text-secondary mt-1">Инженерная школа — Система Рейтинга</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-card p-8 sm:p-10 md:p-12 rounded-2xl border border-border-subtle space-y-6 shadow-sm max-w-2xl mx-auto">
          <h2 className="text-xl font-headline font-bold text-text-main text-center">Вход в систему</h2>

          {error && (
            <div className="bg-status-error/10 border border-status-error/30 text-status-error text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <Icon name="error" className="text-base shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-label text-secondary font-semibold">Логин</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Номер группы или admin"
              className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-5 py-4 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-label text-secondary font-semibold">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-5 py-4 pr-14 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-2xl" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl text-base hover:opacity-90 active:scale-[0.99] transition-all text-lg disabled:opacity-50"
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>

          <div className="text-center">
            <Link to="/auth/forgot-password" className="text-sm text-secondary hover:text-primary transition-colors underline">
              Забыли пароль?
            </Link>
          </div>
        </form>

        <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-border-subtle text-center space-y-3 mt-6 max-w-2xl mx-auto">
          <p className="text-sm text-secondary">
            Для входа используйте учётные данные, выданные администратором.
          </p>
          <p className="text-xs text-secondary">
            Студенты входят по номеру студенческого билета, администратор — по логину.
          </p>
        </div>

        <p className="text-xs text-secondary text-center mt-8">
          © 2024 Уральский федеральный университет. УПИШ.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/auth/login/index.tsx
git commit -m "feat(auth): use backend login on login page"
```

---

### Task 4.2: Rating page with backend upload

**Files:**
- Modify: `frontend/src/pages/rating/index.tsx`

- [ ] **Step 1: Apply replacements in `frontend/src/pages/rating/index.tsx`**

Replace imports block:

```typescript
import { useState, useRef, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminOnly } from "@/components/admin-only";
import { useRatingTable, useUploadExcel } from "@/hooks";
import type { RatingStudent, RatingStats } from "@/types";
import { cn, formatNumber } from "@/lib/utils";
```

Replace state and store usage:

```typescript
const courses = ["Все", "1 курс", "2 курс", "3 курс", "4 курс"];
const PAGE_SIZES = [10, 30, 50, 100];

export default function RatingPage() {
  const [activeCourse, setActiveCourse] = useState("3 курс");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const courseParam = activeCourse === "Все" ? undefined : parseInt(activeCourse);
  const { data, isLoading, error } = useRatingTable(courseParam);
  const uploadExcel = useUploadExcel();

  const students: RatingStudent[] = data?.data?.students ?? [];
  const stats: RatingStats | undefined = data?.data?.stats;
```

Replace `handleFileUpload` and `handleClearImport`:

```typescript
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    uploadExcel.mutate(
      { file },
      {
        onError: (err) => {
          setImportError(err instanceof Error ? err.message : "Неизвестная ошибка импорта");
        },
      }
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const importSummary = uploadExcel.data?.data;
```

Remove `hasMockData`, `mockStudents`, `mockStats`, `hasMockData ? mockStudents : apiStudents`, `parsingType`, `setParsingType`, and the parser toggle in the error block. The rest of the page should use `students` and `stats` directly.

Replace the error block:

```tsx
      {importError && (
        <div className="bg-status-error/10 border border-status-error/30 text-status-error text-sm px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="error" />
            <span>{importError}</span>
          </div>
        </div>
      )}
```

Replace the AdminOnly upload/clear button block:

```tsx
          <AdminOnly>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadExcel.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-label border border-border-subtle text-secondary hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
            >
              <Icon name={uploadExcel.isPending ? "hourglass_empty" : "upload_file"} />
              {uploadExcel.isPending ? "Импорт..." : "Excel"}
            </button>
          </AdminOnly>
```

Replace the import success banner:

```tsx
      {importSummary && (
        <div className="bg-primary-fixed/20 border border-primary/30 text-primary text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <Icon name="check_circle" fill />
          Импортировано {importSummary.studentsImported} студентов
          {importSummary.eventsImported > 0 && ` и ${importSummary.eventsImported} мероприятий`}
        </div>
      )}
```

Replace loading rows condition in table body:

```tsx
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-3 sm:px-4 py-3">
                        <Skeleton className="h-4 w-10 sm:w-12" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/rating/index.tsx
git commit -m "feat(rating): upload excel to backend instead of parsing in browser"
```

---

### Task 4.3: Admin page with backend upload

**Files:**
- Modify: `frontend/src/pages/admin/index.tsx`

- [ ] **Step 1: Replace contents of `frontend/src/pages/admin/index.tsx`**

```tsx
import { useState, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { useUploadExcel } from "@/hooks";

export default function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const uploadExcel = useUploadExcel();
  const summary = uploadExcel.data?.data;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    uploadExcel.mutate(
      { file },
      {
        onError: (err) => {
          setImportError(err instanceof Error ? err.message : "Не удалось прочитать Excel-файл");
        },
      }
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-main">Управление данными</h1>
        <p className="text-sm text-secondary mt-1">Импорт и управление данными студентов</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-card rounded-xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center">
              <Icon name="upload_file" className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-headline font-bold">Импорт Excel</h3>
              <p className="text-xs text-secondary">Загрузите рейтинг студентов из .xlsx файла</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          {importError && (
            <div className="bg-status-error/10 text-status-error text-xs px-3 py-2 rounded-lg">{importError}</div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadExcel.isPending}
            className="w-full bg-primary text-on-primary font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon name={uploadExcel.isPending ? "hourglass_empty" : "upload"} className="text-lg" />
            {uploadExcel.isPending ? "Импорт..." : "Выбрать файл"}
          </button>

          {summary && (
            <div className="bg-primary-fixed/20 text-primary text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <Icon name="check_circle" fill />
              Импортировано {summary.studentsImported} студентов
              {summary.eventsImported > 0 && ` и ${summary.eventsImported} мероприятий`}
            </div>
          )}
        </div>

        <div className="bg-surface-card rounded-xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center">
              <Icon name="info" className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-headline font-bold">Статистика системы</h3>
              <p className="text-xs text-secondary">Основные показатели</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Последний импорт</span>
              <span className="font-bold">{summary ? `${summary.studentsImported} студентов` : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Статус</span>
              <span className="font-bold">{uploadExcel.isPending ? "Обработка..." : summary ? "Готово" : "Нет данных"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/index.tsx
git commit -m "feat(admin): upload excel via backend api"
```

---

### Task 4.4: Dashboard page without mock fallback

**Files:**
- Modify: `frontend/src/pages/dashboard/index.tsx`

- [ ] **Step 1: Replace contents of `frontend/src/pages/dashboard/index.tsx`**

```tsx
import { AdminOnly } from "@/components/admin-only";
import { useDashboardMetrics } from "@/hooks";
import { formatNumber } from "@/lib/utils";
import {
  MetricCard,
  BarChartSection,
  LineChartSection,
  StudentTableSection,
  ScoringFormSection,
  ServerMonitoringSection,
  AILogicBuilderSection,
} from "./components";

export default function DashboardPage() {
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
  } = useDashboardMetrics();
  const m = metricsData?.data;

  return (
    <div className="space-y-xl">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-lg">
        <MetricCard
          label="Всего студентов"
          value={metricsLoading ? undefined : m?.totalStudents?.toString()}
          trend={
            m
              ? { value: `+${m.totalStudentsChange}%`, positive: m.totalStudentsChange >= 0 }
              : undefined
          }
          icon="groups"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Средний балл"
          value={metricsLoading ? undefined : formatNumber(m?.averageGpa)}
          secondary="/ 5.0"
          progress={m ? { value: (m.averageGpa / 5) * 100, max: 100 } : undefined}
          icon="star"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Посещаемость"
          value={metricsLoading ? undefined : `${m?.attendance ?? "—"}%`}
          icon="event_available"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Проектов"
          value={metricsLoading ? undefined : m?.projects?.toString()}
          icon="folder_managed"
          isLoading={metricsLoading}
          error={!!metricsError}
        />
        <MetricCard
          label="Новых заявок"
          value={metricsLoading ? undefined : m?.newRequests?.toString()}
          icon="notifications_active"
          iconFill
          isLoading={metricsLoading}
          error={!!metricsError}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <BarChartSection />
        <LineChartSection />
      </section>

      <AdminOnly>
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
          <StudentTableSection />
          <ScoringFormSection />
        </section>
      </AdminOnly>

      <AdminOnly>
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <ServerMonitoringSection />
          <AILogicBuilderSection />
        </section>
      </AdminOnly>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/index.tsx
git commit -m "feat(dashboard): remove mock fallback and use backend metrics"
```

---

### Task 4.5: Student table with status column

**Files:**
- Modify: `frontend/src/pages/dashboard/components/student-table.tsx`

- [ ] **Step 1: Apply replacements in `frontend/src/pages/dashboard/components/student-table.tsx`**

Replace imports:

```typescript
import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminOnly } from "@/components/admin-only";
import { useStudents, useUpdateStudentRating, useUpdateStudentStatus } from "@/hooks";
import { formatNumber } from "@/lib/utils";
import type { Student, StudentStatus } from "@/types";
import { cn } from "@/lib/utils";
```

Replace state and store usage (remove `fileInputRef`, `importError`, mock store imports):

```typescript
const PAGE_SIZES = [10, 30, 50, 100];

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Активен",
  at_risk: "В группе риска",
  top_reserve: "Топ-резерв",
  expelled: "Отчислен",
};

export function StudentTableSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useStudents({ page: 1, pageSize: 10 });
  const updateRating = useUpdateStudentRating();
  const updateStatus = useUpdateStudentStatus();
  const students: Student[] = data?.data ?? [];
```

Keep `filtered`, `totalPages`, `safePage`, `paginated`, `handleRatingChange`. Remove `handleExcelImport` and `fileInputRef`. Add `handleStatusChange`:

```typescript
  const handleStatusChange = (id: string, value: string) => {
    const status = value as StudentStatus;
    updateStatus.mutate({ id, status });
  };
```

Replace header section to remove import button:

```tsx
      <div className="p-3 sm:p-4 border-b border-border-subtle flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-sm font-headline font-bold">База данных студентов</h3>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-40">
            <Icon
              name="search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-xs"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-7 pr-2 py-1.5 bg-surface-container-low border border-border-subtle rounded text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
```

Replace table headers to add Status column:

```tsx
          <thead className="bg-surface-container-low text-[11px] text-secondary uppercase tracking-widest border-b border-border-subtle sticky top-0 z-10">
            <tr>
              <th className="px-3 sm:px-4 py-3 font-medium">ФИО Студента</th>
              <th className="px-3 sm:px-4 py-3 font-medium">ID</th>
              <th className="px-3 sm:px-4 py-3 font-medium">Курс</th>
              <th className="px-3 sm:px-4 py-3 font-medium text-center">Рейтинг</th>
              <th className="px-3 sm:px-4 py-3 font-medium text-center">Статус</th>
              <AdminOnly>
                <th className="px-3 sm:px-4 py-3 font-medium text-center">Действие</th>
              </AdminOnly>
            </tr>
          </thead>
```

Update colgroup:

```tsx
          <colgroup>
            <col />
            <col className="w-[100px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <AdminOnly>
              <col className="w-[90px]" />
            </AdminOnly>
          </colgroup>
```

Replace table body to remove mock branch and add status select. Replace the entire `tbody` content:

```tsx
          <tbody className="divide-y divide-border-subtle">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
                      <Skeleton className="h-4 w-24 sm:w-32" />
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-12 sm:w-16" />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-10 sm:w-12" />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-8 sm:w-10" />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-20 sm:w-24" />
                  </td>
                  <AdminOnly>
                    <td className="px-3 sm:px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  </AdminOnly>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-status-error text-sm">
                  Ошибка загрузки данных
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-secondary text-sm">
                  {searchTerm ? "Ничего не найдено" : "Нет данных"}
                </td>
              </tr>
            ) : (
              paginated.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-surface-container-low transition-colors group"
                >
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-secondary-fixed rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                        {student.initials}
                      </div>
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-secondary font-mono truncate">
                    {student.studentId}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">{student.course} Курс</td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-primary text-center">
                    {formatNumber(student.rating)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-center">
                    <AdminOnly>
                      <select
                        value={student.status}
                        onChange={(e) => handleStatusChange(student.id, e.target.value)}
                        disabled={updateStatus.isPending}
                        className="bg-surface-container-low border border-border-subtle rounded px-2 py-1 text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </AdminOnly>
                    <span className="sm:hidden">{STATUS_LABELS[student.status]}</span>
                  </td>
                  <AdminOnly>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <input
                        className="w-14 sm:w-16 bg-transparent border border-border-subtle rounded px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-bold text-primary focus:outline-none focus:border-primary text-center"
                        type="number"
                        defaultValue={student.rating}
                        step={0.1}
                        min={0}
                        max={5}
                        onBlur={(e) => handleRatingChange(student.id, e.target.value)}
                      />
                    </td>
                  </AdminOnly>
                </tr>
              ))
            )}
          </tbody>
```

Update empty state colSpan in mobile block from `colSpan={5}` to `colSpan={6}`:

```tsx
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-secondary text-sm">
                {searchTerm ? "Ничего не найдено" : "Нет данных"}
              </td>
            </tr>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/components/student-table.tsx
git commit -m "feat(student-table): add status column and backend-only data"
```

---

### Task 4.6: Scoring form with backend students

**Files:**
- Modify: `frontend/src/pages/dashboard/components/scoring-form.tsx`

- [ ] **Step 1: Replace contents of `frontend/src/pages/dashboard/components/scoring-form.tsx`**

```tsx
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { useScoringLogs, useCreateScoring, useStudents } from "@/hooks";
import type { ScoringLog, Student } from "@/types";

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}

export function ScoringFormSection() {
  const [activityType, setActivityType] = useState("Хакатон");
  const [points, setPoints] = useState("");
  const [participantCount, setParticipantCount] = useState("1");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const { data: logsData, isLoading: logsLoading } = useScoringLogs();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ page: 1, pageSize: 100 });
  const createScoring = useCreateScoring();

  const logs: ScoringLog[] = logsData?.data ?? [];
  const students: Student[] = studentsData?.data ?? [];

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createScoring.mutate({
      activityType,
      points: parseInt(points) || 0,
      participantCount: parseInt(participantCount) || 1,
      studentIds: selectedStudents,
    });
  };

  return (
    <AdminOnly>
      <div className="bg-surface-card p-xl rounded-lg border border-border-subtle shadow-sm flex flex-col">
        <h3 className="text-[--text-headline-sm] font-headline-sm mb-lg">Начисление баллов</h3>
        <form className="space-y-md flex-1" onSubmit={handleSubmit}>
          <div>
            <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
              Тип активности
            </label>
            <select
              className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-sm bg-surface-container-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
            >
              <option>Хакатон</option>
              <option>Научная публикация</option>
              <option>Проектная работа</option>
              <option>Волонтерство</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
                Баллы
              </label>
              <input
                className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-sm bg-surface-container-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="0"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
                К-во участников
              </label>
              <input
                className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-sm bg-surface-container-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="1"
                type="number"
                value={participantCount}
                onChange={(e) => setParticipantCount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
              Выбор студентов
            </label>
            <div className="border border-border-subtle rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto bg-surface-container-low">
              {studentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : students.length === 0 ? (
                <span className="text-sm text-secondary px-2 py-1.5 block">Нет студентов</span>
              ) : (
                students.map((student) => (
                  <label key={student.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container-lowest cursor-pointer text-sm transition-colors">
                    <input
                      className="rounded text-primary focus:ring-primary accent-primary"
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                    />
                    <span>{student.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={createScoring.isPending || selectedStudents.length === 0}
            className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {createScoring.isPending ? (
              <>Отправка...</>
            ) : (
              <>
                <Icon name="how_to_reg" className="text-lg" />
                Начислить {selectedStudents.length} студентам
              </>
            )}
          </button>
        </form>

        <div className="mt-xl pt-lg border-t border-border-subtle">
          <h4 className="text-xs font-bold mb-3 uppercase tracking-widest text-secondary">
            Лог начислений
          </h4>
          <div className="space-y-1.5 text-sm">
            {logsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : logs.length === 0 ? (
              <span className="text-secondary text-xs">Нет записей</span>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex justify-between items-center py-1">
                  <span className="text-status-success text-xs">
                    {log.activityType} (+{log.points})
                  </span>
                  <span className="text-[10px] text-secondary">{formatTimeAgo(log.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/components/scoring-form.tsx
git commit -m "feat(scoring-form): use backend students only"
```

---

### Task 4.7: Analytics page with backend data

**Files:**
- Modify: `frontend/src/pages/analytics/index.tsx`

- [ ] **Step 1: Apply replacements in `frontend/src/pages/analytics/index.tsx`**

Replace imports:

```typescript
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { StudentSelect } from "@/components/student-select";
import { useAuthStore } from "@/stores";
import { useRatingData, useStudentProfile } from "@/hooks";
import { formatNumber, cn } from "@/lib/utils";
import type { RatingStudent } from "@/types";
import {
  MetricCard,
  BarChartSection,
  LineChartSection,
  ScoringFormSection,
  ServerMonitoringSection,
  AILogicBuilderSection,
  StudentRatingTable,
} from "./components";
```

Replace page body (remove mock store usage and calculations):

```typescript
const courses = ["Все", "1", "2", "3", "4"];

export default function AnalyticsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isStudent = currentUser?.role === "student";

  const [activeCourse, setActiveCourse] = useState("Все");
  const courseParam = activeCourse === "Все" ? undefined : parseInt(activeCourse);

  const { rating, metrics, gpa, attendance } = useRatingData(courseParam);
  const ratingStudents: RatingStudent[] = rating.data?.data?.students ?? [];
  const ratingStats = rating.data?.data?.stats;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    isStudent ? (ratingStudents.find((s) => s.isCurrentUser)?.id ?? null) : null
  );

  const selectedStudent = selectedStudentId
    ? ratingStudents.find((s) => s.id === selectedStudentId)
    : ratingStudents.find((s) => s.isCurrentUser);

  const { data: profileData } = useStudentProfile(selectedStudent?.id ?? null);
  const profile = profileData?.data;

  const attendPct = profile?.attendancePct;

  const studentMetrics = isStudent
    ? [
        {
          label: "Общий балл",
          value: formatNumber(selectedStudent?.totalScore),
          icon: "star" as const,
          trend: selectedStudent
            ? {
                value: `#${selectedStudent.rank} место`,
                positive: selectedStudent.rank <= ratingStudents.length * 0.3,
              }
            : undefined,
        },
        {
          label: "Успеваемость",
          value: formatNumber(selectedStudent?.academicScore),
          secondary: "/ 5.0",
          icon: "school" as const,
          progress: selectedStudent ? { value: selectedStudent.academicScore, max: 5 } : undefined,
        },
        {
          label: "Посещаемость",
          value: attendPct != null ? `${attendPct}%` : "—",
          icon: "event_available" as const,
        },
        {
          label: "Активность",
          value: formatNumber(selectedStudent?.activityScore),
          icon: "bolt" as const,
        },
      ]
    : [];

  const m = metrics.data?.data;

  const adminMetrics = !isStudent
    ? [
        {
          label: "Всего студентов",
          value: m?.totalStudents?.toString() ?? "—",
          icon: "groups" as const,
        },
        {
          label: "Средний балл",
          value: formatNumber(m?.averageGpa),
          secondary: "/ 5.0",
          progress: m ? { value: (m.averageGpa / 5) * 100, max: 100 } : undefined,
          icon: "star" as const,
        },
        {
          label: "Посещаемость",
          value: `${m?.attendance ?? "—"}%`,
          icon: "event_available" as const,
        },
        {
          label: "Проектов",
          value: m?.projects?.toString() ?? "—",
          icon: "folder_managed" as const,
        },
        {
          label: "Новых заявок",
          value: m?.newRequests?.toString() ?? "—",
          icon: "notifications_active" as const,
          iconFill: true,
        },
      ]
    : [];

  const metricsList = isStudent ? studentMetrics : adminMetrics;
```

Replace course filter block:

```tsx
      {!isStudent && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Курс:
          </span>
          <div className="flex bg-surface-container-low p-1 rounded-lg border border-border-subtle">
            {courses.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCourse(c)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-label transition-all whitespace-nowrap",
                  activeCourse === c
                    ? "bg-surface-card shadow-sm text-primary font-semibold"
                    : "text-secondary hover:text-text-main"
                )}
              >
                {c === "Все" ? "Все" : `${c} курс`}
              </button>
            ))}
          </div>
        </div>
      )}
```

Replace charts section:

```tsx
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartSection />
        <LineChartSection />
      </section>
```

Replace StudentRatingTable block:

```tsx
      {ratingStudents.length > 0 && (
        <StudentRatingTable students={ratingStudents} activeCourse={activeCourse} />
      )}
```

Replace admin-only characteristics block:

```tsx
      <AdminOnly>
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-surface-card rounded-xl border border-border-subtle p-4 sm:p-6 xl:order-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-headline font-bold text-text-main">
                Характеристики студента
              </h3>
            </div>
            <div className="mb-4">
              <StudentSelect
                students={ratingStudents}
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                placeholder="Выберите студента"
                className="w-full"
              />
            </div>

            {selectedStudent ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Общий балл
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {formatNumber(selectedStudent.totalScore)}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Успеваемость
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {formatNumber(selectedStudent.academicScore)}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Посещаемость
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {attendPct ?? "—"}%
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <div className="text-[10px] text-secondary uppercase font-label tracking-wider mb-1">
                      Активность
                    </div>
                    <div className="text-base font-headline font-bold text-primary">
                      {formatNumber(selectedStudent.activityScore)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary">
                  <span className="font-semibold text-text-main">{selectedStudent.name}</span>
                  <span>•</span>
                  <span>{selectedStudent.group}</span>
                  <span>•</span>
                  <span>#{selectedStudent.rank} место</span>
                  <span>•</span>
                  <span>{selectedStudent.course} курс</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-secondary text-sm">
                Выберите студента для просмотра характеристик
              </div>
            )}
          </div>

          <div className="xl:order-1 md:col-span-2 xl:col-span-1">
            <ScoringFormSection />
          </div>

          <div className="xl:order-2">
            <ServerMonitoringSection />
          </div>

          <div className="xl:order-4">
            <AILogicBuilderSection />
          </div>
        </section>
      </AdminOnly>

      {!isStudent && ratingStudents.length === 0 && (
        <div className="text-center py-12 text-secondary text-sm flex flex-col items-center gap-2">
          <Icon name="info" className="text-xl" />
          <span>Загрузите Excel на странице рейтинга для просмотра аналитики</span>
        </div>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/analytics/index.tsx
git commit -m "feat(analytics): use backend rating data and student profile"
```

---

### Task 4.8: Profile page with backend data

**Files:**
- Modify: `frontend/src/pages/profile/index.tsx`

- [ ] **Step 1: Apply replacements in `frontend/src/pages/profile/index.tsx`**

Replace imports:

```typescript
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/stores";
import { useRatingData } from "@/hooks";
import { cn, formatNumber } from "@/lib/utils";
```

Replace state and data fetching:

```typescript
export default function ProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { rating, metrics } = useRatingData();
  const ratingStudents = rating.data?.data?.students ?? [];
  const ratingStats = rating.data?.data?.stats;
  const dashboardMetrics = metrics.data?.data;
  const currentStudent = ratingStudents.find((s) => s.isCurrentUser);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [group, setGroup] = useState(currentUser?.groupName ?? "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const isAdmin = currentUser?.role === "admin";
```

Replace the password validation block (remove hardcoded "1234" check):

```typescript
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!password) {
      setPasswordError("Введите текущий пароль");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordError("Новый пароль должен быть не менее 4 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    setPasswordSuccess(true);
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };
```

Replace badges in header:

```tsx
            <div
              className={cn(
                "flex flex-wrap gap-2 mt-2 justify-center sm:justify-start",
                isAdmin && "hidden"
              )}
            >
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Рейтинг: {currentStudent?.rank ?? ratingStats?.myPlace ?? "—"}
              </span>
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Баллы: {formatNumber(currentStudent?.totalScore)}
              </span>
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Средний балл: {formatNumber(dashboardMetrics?.averageGpa)}
              </span>
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Посещаемость: {dashboardMetrics?.attendance ?? "—"}%
              </span>
            </div>
```

Replace admin statistics block:

```tsx
              {isAdmin ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Всего студентов</span>
                    <span className="font-bold">{dashboardMetrics?.totalStudents ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Проектов</span>
                    <span className="font-bold">{dashboardMetrics?.projects ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Средний балл</span>
                    <span className="font-bold">{formatNumber(dashboardMetrics?.averageGpa)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Посещаемость</span>
                    <span className="font-bold">{dashboardMetrics?.attendance ?? "—"}%</span>
                  </div>
                </div>
              ) : (
```

And keep the student statistics block as-is, using `currentStudent` and `ratingStats`.

Replace performance section condition:

```tsx
      {!isAdmin && ratingStudents.length > 0 && (
        <section className="bg-surface-card rounded-xl border border-border-subtle p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-headline font-bold text-text-main mb-4">
            Успеваемость
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-lg p-4 text-center">
              <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                Средний балл
              </div>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {formatNumber(currentStudent?.academicScore)}
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4 text-center">
              <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                Активность
              </div>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {formatNumber(currentStudent?.activityScore)}
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4 text-center">
              <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                Общий рейтинг
              </div>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {formatNumber(currentStudent?.totalScore)}
              </div>
            </div>
          </div>
        </section>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/profile/index.tsx
git commit -m "feat(profile): use backend rating and dashboard data"
```

---

### Task 4.9: Scholarships page with backend students

**Files:**
- Modify: `frontend/src/pages/scholarships/index.tsx`

- [ ] **Step 1: Replace contents of `frontend/src/pages/scholarships/index.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { StudentSelect } from "@/components/student-select";
import { useScholarshipStore, useAuthStore } from "@/stores";
import { useRatingTable } from "@/hooks";
import { formatNumber, cn } from "@/lib/utils";
import type { ScholarshipOffer } from "@/types";

const typeIcons: Record<ScholarshipOffer["type"], string> = {
  academic: "school",
  enhanced: "emoji_events",
  achievement: "stars",
};

function ruScoreLabel(score: number): string {
  if (score % 1 !== 0) return "балла";
  const mod10 = score % 10;
  const mod100 = score % 100;
  if (mod10 === 1 && mod100 !== 11) return "балл";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "балла";
  return "баллов";
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}

export default function ScholarshipsPage() {
  const offers = useScholarshipStore((s) => s.offers);
  const loading = useScholarshipStore((s) => s.loading);
  const error = useScholarshipStore((s) => s.error);
  const fetch = useScholarshipStore((s) => s.fetch);

  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: ratingData } = useRatingTable();
  const ratingStudents = ratingData?.data?.students ?? [];
  const currentStudent = ratingStudents.find((s) => s.isCurrentUser);
  const isAdmin = currentUser?.role === "admin";

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const targetStudent = isAdmin
    ? selectedStudentId
      ? ratingStudents.find((s) => s.id === selectedStudentId)
      : null
    : currentStudent;

  const studentScore = targetStudent?.totalScore ?? 0;

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-main">
          {isAdmin ? "Стипендии студентов" : "Мои стипендии"}
        </h1>
        <p className="text-sm text-secondary mt-1">
          {isAdmin
            ? "Проверьте доступные стипендии для выбранного студента"
            : "Проверьте доступные стипендии на основе вашего рейтинга"}
        </p>
      </div>

      {isAdmin && (
        <div className="bg-surface-card rounded-xl border border-border-subtle p-4 sm:p-6">
          <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-3">
            Выберите студента
          </label>
          <StudentSelect
            students={ratingStudents}
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            placeholder="Выберите студента для просмотра стипендий"
          />
        </div>
      )}

      {isAdmin && !selectedStudentId ? (
        <div className="text-center py-12 text-secondary text-sm">
          {ratingStudents.length > 0
            ? "Выберите студента, чтобы увидеть доступные ему стипендии"
            : "Загрузите данные на странице рейтинга"}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-card rounded-xl border border-border-subtle p-5 space-y-4 animate-pulse"
            >
              <div className="h-5 w-32 bg-surface-container-high rounded" />
              <div className="h-4 w-24 bg-surface-container-high rounded" />
              <div className="h-12 w-full bg-surface-container-high rounded" />
              <div className="h-2 w-full bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-status-error text-sm">{error}</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 text-secondary text-sm">Нет доступных стипендий</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => {
            const isAvailable = studentScore >= offer.requiredScore;
            const progressPct = Math.min(
              100,
              Math.round((studentScore / offer.requiredScore) * 100)
            );
            const diff = offer.requiredScore - studentScore;

            return (
              <div
                key={offer.id}
                className={cn(
                  "bg-surface-card rounded-xl border transition-all flex flex-col",
                  isAvailable ? "border-status-success/30" : "border-border-subtle"
                )}
              >
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
                      <Icon name={typeIcons[offer.type]} className="text-primary text-xl" />
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2",
                        isAvailable
                          ? "bg-status-success/10 text-status-success"
                          : "bg-surface-container-high text-text-muted"
                      )}
                    >
                      {offer.type === "academic"
                        ? "Базовая"
                        : offer.type === "enhanced"
                          ? "Повышенная"
                          : "За достижения"}
                    </span>
                  </div>

                  <h3 className="text-base font-headline font-bold text-text-main mb-1">
                    {offer.title}
                  </h3>

                  <div className="text-xl font-headline font-bold text-primary mb-2">
                    {formatAmount(offer.amount)}
                    <span className="text-xs font-normal text-secondary ml-1">/мес</span>
                  </div>

                  <p className="text-xs text-secondary leading-relaxed mb-4 flex-1">
                    {offer.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary">Минимальный рейтинг</span>
                      <span className="font-semibold text-text-main">{offer.requiredScore}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary">Ваш рейтинг</span>
                      <span
                        className={cn(
                          "font-semibold",
                          isAvailable ? "text-status-success" : "text-text-main"
                        )}
                      >
                        {formatNumber(studentScore)}
                      </span>
                    </div>
                  </div>

                  {!isAvailable && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-secondary">Прогресс</span>
                        <span className="font-semibold text-text-main">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "rounded-lg p-3 text-center text-sm font-semibold",
                      isAvailable
                        ? "bg-status-success/10 text-status-success"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {isAvailable ? (
                      <span>Поздравляем! Вы можете претендовать на эту стипендию.</span>
                    ) : (
                      <span>
                        Вам не хватает {formatNumber(diff)} {ruScoreLabel(diff)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/scholarships/index.tsx
git commit -m "feat(scholarships): use backend rating table for student scores"
```

---

### Task 4.10: Overview page with backend data

**Files:**
- Modify: `frontend/src/pages/overview/index.tsx`

- [ ] **Step 1: Apply replacements in `frontend/src/pages/overview/index.tsx`**

Replace imports:

```typescript
import { useState } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@/components/ui/icon";
import { StudentSelect } from "@/components/student-select";
import { useAuthStore } from "@/stores";
import { useRatingData, useStudentProfile } from "@/hooks";
import { cn, formatNumber } from "@/lib/utils";
import type { RatingStudent } from "@/types";
```

Replace state and data fetching:

```typescript
export default function OverviewPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === "admin";

  const { rating, metrics } = useRatingData();
  const ratingStudents = rating.data?.data?.students ?? [];
  const ratingStats = rating.data?.data?.stats;
  const dashboardMetrics = metrics.data?.data;

  const [viewingStudent, setViewingStudent] = useState<RatingStudent | null>(null);

  const targetStudent = viewingStudent ?? ratingStudents.find((s) => s.isCurrentUser);
  const currentStudent = ratingStudents.find((s) => s.isCurrentUser);
  const targetScore = targetStudent?.totalScore ?? 0;

  const { data: profileData } = useStudentProfile(targetStudent?.id ?? null);
  const profile = profileData?.data;

  const attendPct = profile?.attendancePct;
  const projectCount = profile?.projectCount;

  const rank = targetStudent?.rank ?? ratingStats?.myPlace ?? 0;
  const totalStudents = dashboardMetrics?.totalStudents ?? ratingStudents.length ?? 0;
  const myScore = targetScore;
  const maxScore = ratingStudents[0]?.totalScore ?? 0;
  const scorePercent = maxScore > 0 ? Math.round((myScore / maxScore) * 100) : 0;
  const rankPercent =
    totalStudents > 0 ? Math.round(((totalStudents - rank) / totalStudents) * 100) : 0;

  const studentName = targetStudent?.name ?? currentUser?.name ?? "Студент";
  const studentGroup = targetStudent?.group ?? currentUser?.groupName ?? "";
```

Replace admin student selector block:

```tsx
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-text-main">Просмотр студента:</label>
            {ratingStudents.length > 0 ? (
              <div className="w-full sm:w-64">
                <StudentSelect
                  students={ratingStudents}
                  value={targetStudent?.id ?? null}
                  onChange={(id) => {
                    const s = id ? ratingStudents.find((st) => st.id === id) : null;
                    setViewingStudent(s ?? null);
                  }}
                  placeholder="Сводка по всем"
                  showClear={false}
                />
              </div>
            ) : (
              <span className="text-sm text-secondary">Загрузите Excel для выбора студента</span>
            )}
          </div>
          {targetStudent && (
            <button
              onClick={() => setViewingStudent(null)}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Сбросить
            </button>
          )}
        </div>
      )}
```

Replace leaderboards section to use `ratingStudents`:

```tsx
                {ratingStudents.length > 0 ? (
                  <>
                    {ratingStudents.slice(0, 3).map((s) => (
```

And update `me` reference:

```tsx
                    {currentStudent && !ratingStudents.slice(0, 3).find((s) => s.isCurrentUser) && (
                      <tr
                        onClick={() => isAdmin && setViewingStudent(currentStudent)}
                        className={cn("border-l-4 border-primary", isAdmin ? "cursor-pointer" : "")}
                        style={{ backgroundColor: "var(--color-primary-fixed)" }}
                      >
```

Replace empty state text:

```tsx
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-secondary text-sm">
                      {ratingStudents.length === 0 ? "Загрузите данные из Excel" : "Нет данных"}
                    </td>
                  </tr>
                )}
```

Replace the mobile leaderboard block:

```tsx
        <div className="sm:hidden divide-y divide-border-subtle">
          {ratingStudents.length > 0 ? (
            <>
              {ratingStudents.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  onClick={() => isAdmin && setViewingStudent(s)}
                  className={cn(
                    "p-4 hover:bg-surface-container-low transition-colors",
                    viewingStudent?.id === s.id && "bg-primary-fixed/20",
                    isAdmin && "cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        s.rank <= 3 ? "bg-primary text-on-primary" : "bg-secondary-fixed"
                      )}
                    >
                      {s.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-xs text-secondary">{s.group}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-primary">
                        {formatNumber(s.totalScore)}
                      </div>
                      <div className="flex justify-end">
                        {s.trend === "up" && (
                          <Icon name="expand_less" className="text-status-success text-sm" />
                        )}
                        {s.trend === "down" && (
                          <Icon name="expand_more" className="text-status-error text-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {currentStudent && !ratingStudents.slice(0, 3).find((s) => s.isCurrentUser) && (
                <div
                  onClick={() => isAdmin && setViewingStudent(currentStudent)}
                  className={cn(
                    "p-4 border-l-4 border-primary hover:bg-surface-container-low transition-colors",
                    isAdmin && "cursor-pointer"
                  )}
                  style={{ backgroundColor: "var(--color-primary-fixed)" }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {currentStudent.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-primary truncate">
                        {currentStudent.name} (Вы)
                      </div>
                      <div className="text-xs text-primary">{currentStudent.group}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-primary">
                        {formatNumber(currentStudent.totalScore)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-5 py-8 text-center text-secondary text-sm">
              {ratingStudents.length === 0 ? "Загрузите данные из Excel" : "Нет данных"}
            </div>
          )}
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/overview/index.tsx
git commit -m "feat(overview): use backend rating data and student profile"
```

---

## Phase 5: Cleanup

### Task 5.1: Delete mock data and Excel parsing files

**Files:**
- Delete: `frontend/src/stores/use-mock-data-store.ts`
- Delete: `frontend/src/lib/parse-rating-excel.ts`
- Delete: `frontend/src/lib/import-excel.ts`

- [ ] **Step 1: Remove files**

```bash
rm frontend/src/stores/use-mock-data-store.ts
rm frontend/src/lib/parse-rating-excel.ts
rm frontend/src/lib/import-excel.ts
```

Expected: files no longer exist in `frontend/src/stores` and `frontend/src/lib`.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore(frontend): remove mock data store and browser excel parsers"
```

---

### Task 5.2: Remove xlsx dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Uninstall xlsx**

```bash
cd frontend && npm uninstall xlsx
```

Expected: `xlsx` removed from `frontend/package.json` dependencies and `frontend/package-lock.json` updated.

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): remove xlsx dependency"
```

---

## Phase 6: Verification

### Task 6.1: Type check

**Files:** none

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npm run typecheck
```

Expected output: no TypeScript errors.

---

### Task 6.2: Lint

**Files:** none

- [ ] **Step 1: Run linter**

```bash
cd frontend && npm run lint
```

Expected output: no ESLint errors or warnings.

---

### Task 6.3: Dev smoke test

**Files:** none

- [ ] **Step 1: Start backend**

Убедитесь, что PostgreSQL запущен и бэкенд поднят (`python manage.py runserver` в `backend/`).

- [ ] **Step 2: Start frontend dev server**

```bash
cd frontend && npm run dev
```

Expected: Vite dev server starts on `http://localhost:5173`.

- [ ] **Step 3: Login smoke test**

Откройте `http://localhost:5173/auth/login`, введите `admin` / пароль по умолчанию (`1234` или значение `DEFAULT_ADMIN_PASSWORD`).

Expected: перенаправление на `/dashboard`, отображаются метрики.

- [ ] **Step 4: Import smoke test**

Перейдите на `/dashboard/rating`, загрузите корректный `.xlsx`.

Expected: появляется сообщение об импортированных студентах; после инвалидации кэша таблица рейтинга обновляется.

- [ ] **Step 5: Status update smoke test**

Перейдите на `/dashboard`, в таблице студентов измените статус через селект.

Expected: PATCH-запрос к `/api/students/:id`, статус сохраняется после обновления страницы.

---

## Scope coverage

- Заменены все моковые источники данных (`useMockDataStore`, `MOCK_ACCOUNTS`, `MOCK_NOTIFICATIONS`, `MOCK_SCHOLARSHIPS`) на бэкенд-вызовы.
- Удалён браузерный парсинг Excel (`parse-rating-excel.ts`, `import-excel.ts`, `xlsx`).
- Добавлена загрузка файла на бэкенд (`services/import.ts`, `hooks/server/use-import.ts`).
- Добавлено управление статусом студента (`updateStudentStatus`, `useUpdateStudentStatus`, колонка в таблице).
- Добавлен профиль студента (`getStudentProfile`, `useStudentProfile`).
- Добавлен композитный хук `useRatingData`.
- Авторизация переведена на JWT и `/auth/login`.
- Все затронутые страницы (`login`, `rating`, `admin`, `dashboard`, `analytics`, `profile`, `scholarships`, `overview`) используют бэкенд-данные.

## Placeholder scan

- В плане нет `TBD`, `TODO`, `implement later` или ссылок на "аналогичную задачу".
- Каждый файл, импорт, endpoint и команда указаны явно.
- Все шаги имеют ожидаемый результат.

## Type consistency notes

- `StudentStatus` объявлен как union из четырёх строковых значений, соответствующих `Student.Status` Django-модели.
- `StudentProfile` содержит `attendances`, `activities`, `projectCount`, `attendancePct`; сервис `getStudentProfile` мапит `snake_case` поля сериализатора в `camelCase` для TypeScript.
- `students.ts` мапит `student_id` → `studentId`, `group_name` → `groupName` и т.д.
- `useNotificationStore` и `useScholarshipStore` теперь читают `response.data` вместо прямого использования массива.
- `useAuthStore.login` стал асинхронным и возвращает `Promise<{ success, error? }>`; вызывающие страницы используют `await`.

## Out of scope

- Изменения в бэкенде (следуют из `2026-07-11-backend-for-pisha.md`).
- Реализация ИИ-движка и чат-бота (только существующие UI-заглушки остаются).
- Смена пароля и редактирование профиля остаются локальной формой без backend-endpoint (сохраняют только UI-состояние).
- Docker и nginx-конфигурация описаны в backend-плане.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-11-frontend-integration-for-pisha.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — run tasks in this session using `superpowers:executing-plans`.

**Implementation order:**

1. Выполните Phase 1–3 в порядке следования (типы, сервисы, хуки, сторы).
2. Затем Phase 4 (страницы) — они зависят от новых хуков и сервисов.
3. После страниц выполните Phase 5 (удаление файлов и `xlsx`).
4. Завершите Phase 6: `typecheck`, `lint`, dev smoke test.
5. Перед началом убедитесь, что бэкенд-план уже реализован хотя бы до запуска `runserver` и `seed_database`, иначе endpoints будут недоступны.
