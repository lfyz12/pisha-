export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  },
  demo: import.meta.env.VITE_DEMO_MODE === "true",
  app: {
    name: "Pisha",
    version: "0.1.0",
  },
} as const;
