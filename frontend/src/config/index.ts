export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  },
  app: {
    name: "Pisha",
    version: "0.1.0",
  },
} as const;
