import axios from "axios";
import { config } from "@/config";

export const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (!["get", "head", "options"].includes(config.method?.toLowerCase() ?? "get")) {
      const csrfToken = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("csrftoken="))
        ?.split("=")[1];
      if (csrfToken) {
        config.headers["X-CSRFToken"] = decodeURIComponent(csrfToken);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);
