import * as XLSX from "xlsx";
import { parseWorkbook, type ParsedExcelData } from "./parse-rating-excel";
import type { RatingStudent, RatingStats } from "@/types";

const COLUMN_MAP: Record<string, keyof Omit<RatingStudent, "id" | "avatar" | "isCurrentUser" | "trendValue">> = {
  место: "rank",
  ранг: "rank",
  номер: "rank",
  rank: "rank",
  студент: "name",
  фио: "name",
  имя: "name",
  name: "name",
  курс: "course",
  course: "course",
  группа: "group",
  group: "group",
  учеба: "academicScore",
  баллы: "academicScore",
  "баллы (учеба)": "academicScore",
  academic: "academicScore",
  активность: "activityScore",
  "баллы (активность)": "activityScore",
  activity: "activityScore",
  "общий балл": "totalScore",
  итого: "totalScore",
  сумма: "totalScore",
  всего: "totalScore",
  total: "totalScore",
};

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[_\s-]+/g, " ")
    .trim();
}

function parseNumeric(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(",", ".").replace(/[^\d.]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export interface ImportResult {
  students: RatingStudent[];
  stats: RatingStats;
}

/** Try parsing as a simple flat table first, fall back to multi-level header parser. */
export function importExcelFromFile(file: File): Promise<ImportResult | ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target!.result as ArrayBuffer;
        const data = new Uint8Array(buf);
        const workbook = XLSX.read(data, { type: "array" });

        const rawRows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(
          workbook.Sheets[workbook.SheetNames[0]],
          { header: 1 }
        );

        const firstRow = rawRows[0] ?? [];
        const firstCells = firstRow.map((c) => String(c ?? "").toLowerCase().trim());

        const hasMultiLevelHeader = firstCells.some(
          (c) =>
            c.includes("категори") ||
            c.includes("посещаем") ||
            c.includes("научн") ||
            c.includes("проект") ||
            c.includes("внеучеб")
        );

        if (hasMultiLevelHeader) {
          const parsed = parseWorkbook(workbook);
          const simple = convertParsedToSimple(parsed);
          resolve(simple);
        } else {
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            workbook.Sheets[workbook.SheetNames[0]]
          );
          resolve(parseExcelData(json));
        }
      } catch {
        reject(new Error("Ошибка при чтении Excel-файла. Проверьте формат."));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsArrayBuffer(file);
  });
}

function convertParsedToSimple(parsed: ParsedExcelData): ImportResult {
  const { students } = parsed;

  const sorted = [...students].sort((a, b) => b.totalScore - a.totalScore);

  const ratingStudents: RatingStudent[] = sorted.map((s, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const diff = prev ? Math.round((s.totalScore - prev.totalScore) * 10) / 10 : 0;
    let trend: "up" | "down" | "stable" = "stable";
    if (diff > 0) trend = "up";
    else if (diff < 0) trend = "down";

    const scienceSum = Object.values(s.scienceActivity).reduce((a, b) => a + b, 0);
    const projectSum = Object.values(s.projectActivity).reduce((a, b) => a + b, 0);
    const extraSum = Object.values(s.extracurricular).reduce((a, b) => a + b, 0);

    const activityScore = Math.round((scienceSum + projectSum + extraSum) * 10) / 10;

    return {
      id: `imported-${i}`,
      rank: i + 1,
      name: s.fullName,
      course: 3,
      group: s.groupName,
      academicScore: s.averageScore,
      activityScore,
      totalScore: s.totalScore,
      trend,
      trendValue: trend !== "stable" ? Math.abs(diff) : undefined,
      isCurrentUser: i === 11,
    };
  });

  const currentUser = ratingStudents.find((s) => s.isCurrentUser);
  const avgScore =
    ratingStudents.length > 0
      ? Math.round((ratingStudents.reduce((a, b) => a + b.totalScore, 0) / ratingStudents.length) * 10) / 10
      : 0;

  let activityLevel: "Высокая" | "Средняя" | "Низкая" = "Средняя";
  if (currentUser && ratingStudents.length > 0) {
    const avgActivity =
      ratingStudents.reduce((a, b) => a + (b.activityScore || 0), 0) / ratingStudents.length;
    if (currentUser.activityScore > avgActivity) activityLevel = "Высокая";
    else if (currentUser.activityScore < avgActivity * 0.5) activityLevel = "Низкая";
  }

  const stats: RatingStats = {
    myPlace: currentUser?.rank ?? 0,
    myPlaceChange: 3,
    topScore: ratingStudents[0]?.totalScore ?? 0,
    averageScore: avgScore,
    activityLevel,
  };

  return {
    students: ratingStudents,
    stats,
  };
}

export function parseExcelData(rows: Record<string, unknown>[]): ImportResult {
  if (rows.length === 0) {
    return { students: [], stats: emptyStats() };
  }

  const headerKeys = Object.keys(rows[0]);
  const mappedKeys: Record<string, keyof Omit<RatingStudent, "id" | "avatar" | "isCurrentUser" | "trendValue"> | null> = {};

  for (const key of headerKeys) {
    const normalized = normalizeKey(key);
    if (COLUMN_MAP[normalized]) {
      mappedKeys[key] = COLUMN_MAP[normalized];
    }
  }

  const students: RatingStudent[] = rows.map((row, idx) => {
    const name = String(row[mappedKeys["name"] ?? "name"] ?? row[headerKeys.find((k) => normalizeKey(k) === "студент" || normalizeKey(k) === "фио" || normalizeKey(k) === "имя") ?? ""] ?? "");
    const course = parseNumeric(row[mappedKeys["course"] ?? "course"] ?? row[headerKeys.find((k) => normalizeKey(k) === "курс" || normalizeKey(k) === "course") ?? ""] ?? 0);
    const academicScore = parseNumeric(row[mappedKeys["academicScore"] ?? "academicScore"] ?? 0);
    const activityScore = parseNumeric(row[mappedKeys["activityScore"] ?? "activityScore"] ?? 0);
    const rank = parseNumeric(row[mappedKeys["rank"] ?? "rank"] ?? idx + 1);
    const group = String(row[mappedKeys["group"] ?? "group"] ?? row[headerKeys.find((k) => normalizeKey(k) === "группа" || normalizeKey(k) === "group") ?? ""] ?? "");
    const totalScore = parseNumeric(row[mappedKeys["totalScore"] ?? "totalScore"] ?? row[headerKeys.find((k) => normalizeKey(k) === "общий балл" || normalizeKey(k) === "итого" || normalizeKey(k) === "сумма" || normalizeKey(k) === "всего" || normalizeKey(k) === "total") ?? ""] ?? academicScore + activityScore);

    return {
      id: `imported-${idx}`,
      rank,
      name,
      course: Math.round(course),
      group,
      academicScore,
      activityScore,
      totalScore,
      trend: "stable",
      isCurrentUser: idx === 11,
    };
  });

  const sorted = [...students].sort((a, b) => b.totalScore - a.totalScore);
  sorted.forEach((s, i) => {
    s.rank = i + 1;
    if (i > 0) {
      const prev = sorted[i - 1];
      if (s.totalScore > prev.totalScore) s.trend = "up";
      else if (s.totalScore < prev.totalScore) s.trend = "down";
      else s.trend = "stable";
    }
  });

  const currentUser = sorted.find((s) => s.isCurrentUser);
  const stats: RatingStats = {
    myPlace: currentUser?.rank ?? 0,
    myPlaceChange: 0,
    topScore: sorted[0]?.totalScore ?? 0,
    averageScore: Math.round((sorted.reduce((sum, s) => sum + s.totalScore, 0) / sorted.length) * 10) / 10,
    activityLevel: "Средняя",
  };

  return { students: sorted, stats };
}

function emptyStats(): RatingStats {
  return {
    myPlace: 0,
    myPlaceChange: 0,
    topScore: 0,
    averageScore: 0,
    activityLevel: "Низкая",
  };
}
