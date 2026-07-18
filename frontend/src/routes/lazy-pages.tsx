import { lazy } from "react";

export const LoginPage = lazy(() => import("@/pages/auth/login"));
export const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
export const OverviewPage = lazy(() => import("@/pages/overview"));
export const AnalyticsPage = lazy(() => import("@/pages/analytics"));
export const ProfilePage = lazy(() => import("@/pages/profile"));
export const AdminPage = lazy(() => import("@/pages/admin"));
export const RatingPage = lazy(() => import("@/pages/rating"));
export const ScholarshipsPage = lazy(() => import("@/pages/scholarships"));
export const ChatPage = lazy(() => import("@/pages/chat"));
export const NotFoundPage = lazy(() => import("@/pages/errors/not-found"));
export const ForbiddenPage = lazy(() => import("@/pages/errors/forbidden"));
