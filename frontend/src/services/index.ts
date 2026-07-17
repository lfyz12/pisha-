export {
  getStudents,
  getStudent,
  getStudentProfile,
  updateStudentRating,
  updateStudentStatus,
} from "./students";
export { getDashboardMetrics, getGpaDistribution, getAttendanceTrends } from "./dashboard";
export { getScoringLogs, createScoring } from "./scoring";
export { getAIRules, createAIRule } from "./ai-rules";
export { getServerMetrics } from "./server";
export { getRatingTable } from "./rating";
export { getScholarships } from "./scholarships";
export { listSessions, createSession, deleteSession, listMessages, streamMessage } from "./chat";
export type { StreamHandlers } from "./chat";
export {
  listDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  reingestDocument,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./kb";
export type { UploadDocumentPayload, CategoryPayload } from "./kb";
export { listProjects, uploadProject, deleteProject } from "./projects";
export { fetchNotifications, markAsRead, markAllAsRead } from "./notification";
export { fetchScholarshipOffers } from "./scholarship-service";
export { uploadExcel } from "./import";
export { consumeCredentialBundle, getAccessPolicy, updateAccessPolicy } from "./security";
