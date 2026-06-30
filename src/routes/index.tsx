import { createBrowserRouter, Navigate } from "react-router";
import RootLayout from "@/layouts/root-layout";
import AuthLayout from "@/layouts/auth-layout";
import DashboardLayout from "@/layouts/dashboard-layout";
import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import OverviewPage from "@/pages/overview";
import AnalyticsPage from "@/pages/analytics";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import RatingPage from "@/pages/rating";
import ScholarshipsPage from "@/pages/scholarships";
import ChatPage from "@/pages/chat";
import NotFoundPage from "@/pages/errors/not-found";
import ForbiddenPage from "@/pages/errors/forbidden";

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
          { index: true, element: <LoginPage /> },
          { path: "login", element: <LoginPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      {
        path: "dashboard",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: "analytics", element: <AnalyticsPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "admin", element: <AdminPage /> },
          { path: "rating", element: <RatingPage /> },
          { path: "scholarships", element: <ScholarshipsPage /> },
          { path: "chat", element: <ChatPage /> },
        ],
      },
      { path: "forbidden", element: <ForbiddenPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
