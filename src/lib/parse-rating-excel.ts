import * as XLSX from "xlsx";

export interface ExcelStudentRaw {
  groupName: string;
  fullName: string;
  totalScore: number;
  averageScore: number;
  attendance: number[];
  scienceActivity: Record<string, number>;
  projectActivity: Record<string, number>;
  extracurricular: Record<string, number>;
}

export interface ExcelEvent {
  id: number;
  name: string;
  category: string;
  date: string;
  level: string;
  status: string;
  points: number;
}

export interface ParsedExcelData {
  students: ExcelStudentRaw[];
  events: ExcelEvent[];
}

function fillForward(row: (string | number | null | undefined)[]): (string | number | null | undefined)[] {
  const result: (string | number | null | undefined)[] = [];
  let last: string | number | null | undefined = null;
  for (const cell of row) {
    if (cell !== null && cell !== undefined && cell !== "") {
      last = cell;
    }
    result.push(last);
  }
  return result;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(",", ".").replace(/[^\d.]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function toString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

interface ColumnCategory {
  type: "base" | "attendance" | "science" | "project" | "extracurricular";
  subKey?: string;
  colIndex: number;
}

export function parseRatingExcel(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const result = parseWorkbook(workbook);
        resolve(result);
      } catch {
        reject(new Error("Ошибка при чтении Excel-файла. Проверьте формат."));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseWorkbook(workbook: XLSX.WorkBook): ParsedExcelData {
  const sheetNames = workbook.SheetNames;

  const mainSheet = workbook.Sheets[sheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(mainSheet, { header: 1 });

  const events = parseEventsSheet(workbook, sheetNames);

  const students = parseMainSheet(rawRows);

  return { students, events };
}

function parseEventsSheet(workbook: XLSX.WorkBook, sheetNames: string[]): ExcelEvent[] {
  const eventsSheet = sheetNames.find(
    (name) =>
      name.toLowerCase().includes("перечень") || name.toLowerCase().includes("мероприя")
  );
  if (!eventsSheet) return [];

  const sheet = workbook.Sheets[eventsSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return rows.map((row, idx) => {
    const vals = Object.values(row);
    return {
      id: toNumber(vals[0]) || idx + 1,
      name: toString(vals[1]),
      category: toString(vals[2]),
      date: toString(vals[3]),
      level: toString(vals[4]),
      status: toString(vals[5]),
      points: toNumber(vals[6]),
    };
  });
}

function parseMainSheet(rawRows: (string | number | null | undefined)[][]): ExcelStudentRaw[] {
  if (rawRows.length < 4) return [];

  const HEADER_KEYWORDS = ["групп", "фио", "номер", "балл", "посещаем", "категори", "успеваем"];

  function isMetaRow(row: (string | number | null | undefined)[], idx: number): boolean {
    const first4 = row.slice(0, 4).map((c) => toString(c).toLowerCase());
    const allEmpty = first4.every((c) => !c);
    if (!allEmpty) return false;
    const restText = row.slice(4).map((c) => toString(c).toLowerCase()).filter(Boolean);
    const hasMetaText = restText.some((t) => t.includes("количеств") || t.includes("учебн") || t.includes("семестр"));
    return hasMetaText || (idx === 0 && restText.length > 0);
  }

  function isHeaderRow(row: (string | number | null | undefined)[]): boolean {
    const first4 = row.slice(0, 4).map((c) => toString(c).toLowerCase());
    return first4.some((c) => HEADER_KEYWORDS.some((kw) => c.includes(kw)));
  }

  let headerStartIndex = 0;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;
    if (isMetaRow(row, i)) continue;
    if (isHeaderRow(row)) {
      headerStartIndex = i;
      break;
    }
  }

  const headerRows: (string | number | null | undefined)[][] = [];
  let dataStartIndex = headerStartIndex;

  for (let i = headerStartIndex; i < Math.min(headerStartIndex + 5, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;
    const firstCell = toString(row[0]).toLowerCase();
    const isStillHeader =
      firstCell === "" ||
      HEADER_KEYWORDS.some((kw) => firstCell.includes(kw)) ||
      (row.length > 0 && headerRows.length < 3);

    if (isStillHeader) {
      headerRows.push(row);
    } else {
      dataStartIndex = i;
      break;
    }
  }

  if (headerRows.length < 2) {
    console.warn("[parse-rating-excel] Not enough header rows, trying fallback");
    return [];
  }

  const maxCols = Math.max(
    ...rawRows.map((r) => (r ? r.length : 0)),
    5
  );

  const filledHeaders = headerRows.map((r) => {
    const padded = [...r];
    while (padded.length < maxCols) padded.push(null);
    return fillForward(padded);
  });

  const numHeaderRows = filledHeaders.length;

  const categories: (ColumnCategory | null)[] = [];
  for (let col = 0; col < maxCols; col++) {
    const topLabel = toString(filledHeaders[0]?.[col] ?? "").toLowerCase();

    if (
      topLabel.includes("групп") ||
      topLabel.includes("номер")
    ) {
      categories.push({ type: "base", subKey: "groupName", colIndex: col });
    } else if (
      topLabel.includes("фио") ||
      topLabel.includes("фам") ||
      topLabel.includes("имя") ||
      topLabel.includes("студент")
    ) {
      categories.push({ type: "base", subKey: "fullName", colIndex: col });
    } else if (
      topLabel.includes("итогов") ||
      (topLabel.includes("балл") && !topLabel.includes("средн"))
    ) {
      categories.push({ type: "base", subKey: "totalScore", colIndex: col });
    } else if (topLabel.includes("средн") || (topLabel.includes("балл") && topLabel.includes("успеваем"))) {
      categories.push({ type: "base", subKey: "averageScore", colIndex: col });
    } else if (topLabel.includes("посещаем") || topLabel.includes("образов")) {
      const subLabels: string[] = [];
      for (let h = 1; h < numHeaderRows; h++) {
        const v = toString(filledHeaders[h]?.[col] ?? "");
        if (v) subLabels.push(v);
      }
      const weekLabel = subLabels.find((s) => /^\d+$/.test(s)) || `week-${col}`;
      categories.push({ type: "attendance", subKey: weekLabel, colIndex: col });
    } else if (topLabel.includes("научн")) {
      const subLabels: string[] = [];
      for (let h = 1; h < numHeaderRows; h++) {
        const v = toString(filledHeaders[h]?.[col] ?? "");
        if (v) subLabels.push(v);
      }
      const label = subLabels[0] || `science-${col}`;
      categories.push({ type: "science", subKey: label, colIndex: col });
    } else if (topLabel.includes("проект")) {
      const subLabels: string[] = [];
      for (let h = 1; h < numHeaderRows; h++) {
        const v = toString(filledHeaders[h]?.[col] ?? "");
        if (v) subLabels.push(v);
      }
      const label = subLabels[0] || `project-${col}`;
      categories.push({ type: "project", subKey: label, colIndex: col });
    } else if (topLabel.includes("внеучеб") || topLabel.includes("внеуч")) {
      const subLabels: string[] = [];
      for (let h = 1; h < numHeaderRows; h++) {
        const v = toString(filledHeaders[h]?.[col] ?? "");
        if (v) subLabels.push(v);
      }
      const label = subLabels[0] || `extracurr-${col}`;
      categories.push({ type: "extracurricular", subKey: label, colIndex: col });
    } else {
      categories.push(null);
    }
  }

  if (headerRows.length === 0) {
    console.warn("[parse-rating-excel] No header rows detected — trying row 3 as header");
    if (rawRows.length > 3) {
      headerRows.push(rawRows[0], rawRows[1] ?? [], rawRows[2] ?? []);
      dataStartIndex = 3;
    }
  }

  const parsedStudents: ExcelStudentRaw[] = [];

  for (let i = dataStartIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const firstCell = toString(row[0]);
    if (!firstCell || /^[А-Яа-я\s-]+$/i.test(firstCell) === false) {
      const hasNumeric = row.some((cell) => typeof cell === "number" || (typeof cell === "string" && /[\d]/.test(cell)));
      if (!hasNumeric) continue;
    }

    const student: ExcelStudentRaw = {
      groupName: "",
      fullName: "",
      totalScore: 0,
      averageScore: 0,
      attendance: [],
      scienceActivity: {},
      projectActivity: {},
      extracurricular: {},
    };

    const attendanceMap: Record<string, number> = {};
    const scienceMap: Record<string, number> = {};
    const projectMap: Record<string, number> = {};
    const extracurrMap: Record<string, number> = {};

    for (let col = 0; col < Math.min(row.length, categories.length); col++) {
      const cat = categories[col];
      if (!cat) continue;
      const cellVal = row[col];

      switch (cat.type) {
        case "base":
          if (cat.subKey === "groupName") student.groupName = toString(cellVal);
          else if (cat.subKey === "fullName") student.fullName = toString(cellVal);
          else if (cat.subKey === "totalScore") student.totalScore = toNumber(cellVal);
          else if (cat.subKey === "averageScore") student.averageScore = toNumber(cellVal);
          break;
        case "attendance":
          attendanceMap[cat.subKey!] = toNumber(cellVal);
          break;
        case "science":
          scienceMap[cat.subKey!] = toNumber(cellVal);
          break;
        case "project":
          projectMap[cat.subKey!] = toNumber(cellVal);
          break;
        case "extracurricular":
          extracurrMap[cat.subKey!] = toNumber(cellVal);
          break;
      }
    }

    const weekKeys = Object.keys(attendanceMap).sort((a, b) => {
      const an = parseInt(a);
      const bn = parseInt(b);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });
    student.attendance = weekKeys.map((k) => attendanceMap[k]);

    student.scienceActivity = scienceMap;
    student.projectActivity = projectMap;
    student.extracurricular = extracurrMap;

    if (student.fullName) {
      parsedStudents.push(student);
    }
  }

  console.log(`[parse-rating-excel] Parsed ${parsedStudents.length} students (dataStartIndex=${dataStartIndex}, headerRows=${headerRows.length})`);
  if (parsedStudents.length === 0 && rawRows.length > 0) {
    console.warn("[parse-rating-excel] Sample header row:", rawRows[0]?.slice(0, 8));
    console.warn("[parse-rating-excel] Sample data row:", rawRows[Math.min(dataStartIndex, rawRows.length - 1)]?.slice(0, 8));
  }

  return parsedStudents;
}
