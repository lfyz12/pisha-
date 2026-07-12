export type StudentStatus = "active" | "at_risk" | "top_reserve" | "expelled";

export interface Student {
  id: string;
  name: string;
  initials: string;
  studentId: string;
  course: number;
  rating: number;
  status: StudentStatus;
  groupName?: string;
}

export interface StudentAttendance {
  weekIndex: number;
  value: number;
}

export interface StudentActivity {
  category: "science" | "project" | "extracurricular";
  name: string;
  points: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  initials: string;
  studentId: string;
  course: number;
  groupName: string;
  rating: number;
  status: StudentStatus;
  totalScore: number;
  averageScore: number;
  attendances: StudentAttendance[];
  activities: StudentActivity[];
  projectCount: number;
  attendancePct: number;
}

export interface DashboardMetrics {
  totalStudents: number;
  totalStudentsChange: number;
  averageGpa: number;
  attendance: number;
  projects: number;
  newRequests: number;
}

export interface GpaBarData {
  label: string;
  value: number;
}

export interface AttendanceTrend {
  month: string;
  value: number;
}

export interface ScoringLog {
  id: string;
  activityType: string;
  points: number;
  createdAt: string;
}

export interface AIRule {
  id: string;
  conditions: string[];
  actions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ScoringPayload {
  activityType: string;
  points: number;
  participantCount: number;
  studentIds: string[];
}

export interface ServerMetrics {
  cpuLoad: number;
  ramUsage: number;
  gpuUsage: number;
  status: "online" | "offline" | "warning";
  location: string;
}

export interface RatingStudent {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  course: number;
  group: string;
  academicScore: number;
  activityScore: number;
  totalScore: number;
  trend: "up" | "down" | "stable";
  trendValue?: number;
  isCurrentUser?: boolean;
}

export interface RatingStats {
  myPlace: number;
  myPlaceChange: number;
  topScore: number;
  averageScore: number;
  activityLevel: "Высокая" | "Средняя" | "Низкая";
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  logo?: string;
  description: string;
  tags: string[];
  amount: number;
  currency: string;
  period: string;
  matchPercent: number;
  minRating?: number;
  isAvailable: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface ScholarshipFilter {
  query?: string;
  minMatch?: number;
  tags?: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  initials: string;
  groupName: string;
  role: "student" | "admin";
  avatarUrl?: string;
}
