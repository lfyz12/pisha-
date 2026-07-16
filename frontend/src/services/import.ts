import type { ApiResponse, ImportSummary } from "@/types";
import { apiClient } from "@/lib/api-client";

interface ImportSummaryRaw {
  students_imported: number;
  events_imported: number;
  credential_bundle_id?: string;
}

export async function uploadExcel(
  file: File,
  parser?: "auto" | "multi" | "flat"
): Promise<ApiResponse<ImportSummary>> {
  const formData = new FormData();
  formData.append("file", file);
  if (parser) {
    formData.append("parser", parser);
  }

  const { data } = await apiClient.post<ApiResponse<ImportSummaryRaw>>("/import/excel", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return {
    ...data,
    data: {
      studentsImported: data.data.students_imported,
      eventsImported: data.data.events_imported,
      credentialBundleId: data.data.credential_bundle_id,
    },
  };
}
