import { Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import RootLayout from "@/layouts/root-layout";
import AuthLayout from "@/layouts/auth-layout";
import DashboardLayout from "@/layouts/dashboard-layout";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  LoginPage,
  ForgotPasswordPage,
  OverviewPage,
  AnalyticsPage,
  ProfilePage,
  AdminPage,
  RatingPage,
  ScholarshipsPage,
  ChatPage,
  NotFoundPage,
  ForbiddenPage,
} from "./lazy-pages";

const lazyElement = (element: ReactNode) => (
  <Suspense fallback={<PageSkeleton />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          { index: true, element: lazyElement(<LoginPage />) },
          { path: "login", element: lazyElement(<LoginPage />) },
          { path: "forgot-password", element: lazyElement(<ForgotPasswordPage />) },
        ],
      },
      {
        path: "dashboard",
        element: <DashboardLayout />,
        children: [
          { index: true, element: lazyElement(<OverviewPage />) },
          { path: "analytics", element: lazyElement(<AnalyticsPage />) },
          { path: "profile", element: lazyElement(<ProfilePage />) },
          { path: "admin", element: lazyElement(<AdminPage />) },
          { path: "rating", element: lazyElement(<RatingPage />) },
          { path: "scholarships", element: lazyElement(<ScholarshipsPage />) },
          { path: "chat", element: lazyElement(<ChatPage />) },
        ],
      },
      { path: "forbidden", element: lazyElement(<ForbiddenPage />) },
      { path: "*", element: lazyElement(<NotFoundPage />) },
    ],
  },
]);
