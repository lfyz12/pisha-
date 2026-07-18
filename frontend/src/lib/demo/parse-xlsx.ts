import type { DemoEvent, RawDemoStudent } from "./db";

export interface ParsedRating {
  students: RawDemoStudent[];
  events: DemoEvent[];
}

function toText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(toText(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

type Sheet = Array<Array<unknown>>;

/**
 * Парсит файл рейтинга УПИШ в браузере. Данные никуда не отправляются —
 * результат просто заменяет содержимое in-memory demo DB.
 *
 * Лист 1: данные с 4-й строки (индекс 3), A = группа, B = ФИО,
 * C = итоговый балл, D = средний балл. Строки без ФИО пропускаются.
 */
export async function parseRatingXlsx(file: Blob): Promise<ParsedRating> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { students: [], events: [] };
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  }) as Sheet;

  const students: RawDemoStudent[] = [];
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const fullName = toText(row[1]);
    if (!fullName) continue;
    students.push({
      group_name: toText(row[0]),
      full_name: fullName,
      total_score: toNumber(row[2]),
      average_score: toNumber(row[3]),
      attendance: [],
      science_activity: {},
      project_activity: {},
      extracurricular: {},
    });
  }

  return { students, events: parseEvents(workbook.Sheets, workbook.SheetNames, XLSX) };
}

function parseEvents(
  sheets: Record<string, unknown>,
  sheetNames: string[],
  XLSX: typeof import("xlsx")
): DemoEvent[] {
  const sheetName = sheetNames.find((name) => name.trim().startsWith("Перечень мероприятий"));
  const sheet = sheetName ? sheets[sheetName] : undefined;
  if (!sheet) return [];
  try {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(
      sheet as Parameters<typeof XLSX.utils.sheet_to_json>[0],
      { header: 1, raw: true, defval: null }
    ) as Sheet;
    // Шапка: №, Наименование, Вид деятельности, Дата, Уровень, Статус, Баллы.
    // Строки без наименования — продолжение предыдущего мероприятия, пропускаем.
    const events: DemoEvent[] = [];
    for (const row of rows.slice(1)) {
      const name = toText(row?.[1]);
      if (!name) continue;
      events.push({
        id: events.length + 1,
        name,
        category: toText(row[2]),
        date: toText(row[3]),
        level: toText(row[4]),
        status: toText(row[5]),
        points: toNumber(row[6]),
      });
    }
    return events;
  } catch {
    return [];
  }
}
