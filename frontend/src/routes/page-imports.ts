export const importLoginPage = () => import("@/pages/auth/login");
export const importForgotPasswordPage = () => import("@/pages/auth/forgot-password");
export const importOverviewPage = () => import("@/pages/overview");
export const importAnalyticsPage = () => import("@/pages/analytics");
export const importProfilePage = () => import("@/pages/profile");
export const importAdminPage = () => import("@/pages/admin");
export const importRatingPage = () => import("@/pages/rating");
export const importScholarshipsPage = () => import("@/pages/scholarships");
export const importChatPage = () => import("@/pages/chat");
export const importNotFoundPage = () => import("@/pages/errors/not-found");
export const importForbiddenPage = () => import("@/pages/errors/forbidden");

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  "/dashboard": importOverviewPage,
  "/dashboard/analytics": importAnalyticsPage,
  "/dashboard/profile": importProfilePage,
  "/dashboard/admin": importAdminPage,
  "/dashboard/rating": importRatingPage,
  "/dashboard/scholarships": importScholarshipsPage,
  "/dashboard/chat": importChatPage,
};

// Warms the lazy chunk for a route ahead of navigation. Repeated calls are
// deduplicated by the module loader's import cache; failures are ignored
// because the import is retried when the route is actually visited.
export const prefetchRoute = (path: string) => {
  void routePrefetchers[path]?.().catch(() => {});
};
