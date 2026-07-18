import { lazy } from "react";
import {
  importLoginPage,
  importForgotPasswordPage,
  importOverviewPage,
  importAnalyticsPage,
  importProfilePage,
  importAdminPage,
  importRatingPage,
  importScholarshipsPage,
  importChatPage,
  importNotFoundPage,
  importForbiddenPage,
} from "./page-imports";

export const LoginPage = lazy(importLoginPage);
export const ForgotPasswordPage = lazy(importForgotPasswordPage);
export const OverviewPage = lazy(importOverviewPage);
export const AnalyticsPage = lazy(importAnalyticsPage);
export const ProfilePage = lazy(importProfilePage);
export const AdminPage = lazy(importAdminPage);
export const RatingPage = lazy(importRatingPage);
export const ScholarshipsPage = lazy(importScholarshipsPage);
export const ChatPage = lazy(importChatPage);
export const NotFoundPage = lazy(importNotFoundPage);
export const ForbiddenPage = lazy(importForbiddenPage);
