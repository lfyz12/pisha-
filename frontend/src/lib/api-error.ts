import axios from "axios";

/**
 * Extracts the backend error message (envelope: `{message, status}`)
 * from an unknown caught value, falling back to a generic text.
 */
export function extractApiError(error: unknown, fallback = "Не удалось выполнить запрос"): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}
