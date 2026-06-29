export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  },
  app: {
    name: "Pisha",
    version: "0.1.0",
  },
} as const;
