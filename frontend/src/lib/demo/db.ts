import fixture from "@/lib/demo-fixture.json";

export type DemoActivityCategory = "science" | "project" | "extracurricular";

export interface DemoActivity {
  category: DemoActivityCategory;
  name: string;
  points: number;
}

export interface DemoStudent {
  id: string;
  name: string;
  initials: string;
  student_id: string;
  course: number;
  group_name: string;
  rating: number;
  status: "active" | "at_risk" | "top_reserve" | "expelled";
  total_score: number;
  average_score: number;
  attendance: number[];
  activities: DemoActivity[];
}

export interface DemoEvent {
  id: number;
  name: string;
  category: string;
  date: string;
  level: string;
  status: string;
  points: number;
}

/** Сырая строка фикстуры / результата парсинга Excel (snake_case, как в импорте). */
export interface RawDemoStudent {
  group_name: string;
  full_name: string;
  total_score: number;
  average_score: number;
  attendance: number[];
  science_activity: Record<string, number>;
  project_activity: Record<string, number>;
  extracurricular: Record<string, number>;
}

/** Посещаемость в файле рейтинга — количество посещённых занятий из 8 в неделю. */
export const MAX_WEEKLY_LESSONS = 8;

export const demoDb: { students: DemoStudent[]; events: DemoEvent[] } = {
  students: [],
  events: [],
};

function detectCourse(groupName: string): number {
  const match = groupName.match(/\d/);
  return match ? Number(match[0]) : 3;
}

function makeInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function activitiesFrom(
  category: DemoActivityCategory,
  record: Record<string, number>
): DemoActivity[] {
  return Object.entries(record ?? {}).map(([name, points]) => ({
    category,
    name,
    points: Number(points) || 0,
  }));
}

/** Полностью заменяет содержимое demo DB (используется и для посева, и для импорта). */
export function seedDemoDb(rawStudents: RawDemoStudent[], rawEvents: DemoEvent[]): void {
  demoDb.students = rawStudents.map((raw, index) => ({
    id: `demo-${index + 1}`,
    name: raw.full_name,
    initials: makeInitials(raw.full_name),
    student_id: raw.group_name
      ? `${raw.group_name}-${String(index + 1).padStart(3, "0")}`
      : `STU-${String(index + 1).padStart(4, "0")}`,
    course: detectCourse(raw.group_name),
    group_name: raw.group_name,
    rating: raw.average_score,
    status: "active",
    total_score: raw.total_score,
    average_score: raw.average_score,
    attendance: raw.attendance ?? [],
    activities: [
      ...activitiesFrom("science", raw.science_activity),
      ...activitiesFrom("project", raw.project_activity),
      ...activitiesFrom("extracurricular", raw.extracurricular),
    ],
  }));
  demoDb.events = rawEvents.map((event, index) => ({ ...event, id: event.id ?? index + 1 }));
}

seedDemoDb(fixture.students as RawDemoStudent[], fixture.events as DemoEvent[]);
