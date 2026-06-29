import { useQuery } from "@tanstack/react-query";
import { getServerMetrics } from "@/services/server";
import type { ApiResponse, ServerMetrics } from "@/types";

const SERVER_KEYS = {
  all: ["server"] as const,
  metrics: () => [...SERVER_KEYS.all, "metrics"] as const,
};

export function useServerMetrics() {
  return useQuery<ApiResponse<ServerMetrics>, Error>({
    queryKey: SERVER_KEYS.metrics(),
    queryFn: getServerMetrics,
    refetchInterval: 30000,
  });
}
