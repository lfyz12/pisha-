import { useState, useRef, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminOnly } from "@/components/admin-only";
import { useRatingTable } from "@/hooks";
import { useMockDataStore } from "@/stores";
import { parseRatingExcel } from "@/lib/parse-rating-excel";
import { importExcelFromFile } from "@/lib/import-excel";
import type { RatingStudent, RatingStats } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

const courses = ["Все", "1 курс", "2 курс", "3 курс", "4 курс"];

const PAGE_SIZE = 30;

export default function RatingPage() {
  const [activeCourse, setActiveCourse] = useState("3 курс");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [importError, setImportError] = useState("");
  const [parsingType, setParsingType] = useState<"simple" | "multi">("multi");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mockStore = useMockDataStore();

  const courseParam = activeCourse === "Все" ? undefined : parseInt(activeCourse);
  const { data, isLoading, error } = useRatingTable(courseParam);

  const apiStudents: RatingStudent[] = data?.data?.students ?? [];
  const apiStats = data?.data?.stats;

  const mockStudents = mockStore.parsedData ? mockStore.getRatingStudents(courseParam) : [];
  const mockStats = mockStore.parsedData ? mockStore.getRatingStats() : undefined;

  const hasMockData = mockStore.parsedData !== null;
  const students = hasMockData ? mockStudents : apiStudents;
  const stats = hasMockData ? mockStats : apiStats;

  const filtered = useMemo(() => {
    if (!searchTerm) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        String(s.course).includes(q)
    );
  }, [students, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = page > totalPages ? 1 : page;
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    try {
      if (parsingType === "multi") {
        const data = await parseRatingExcel(file);
        mockStore.setExcelData(data, file.name);
      } else {
        const result = await importExcelFromFile(file);
        if ("students" in result && "stats" in result) {
          const simpleResult = result as { students: RatingStudent[]; stats: RatingStats };
          const convertedData = {
            students: simpleResult.students.map((s) => ({
              groupName: s.group,
              fullName: s.name,
              totalScore: s.totalScore,
              averageScore: s.academicScore,
              attendance: [] as number[],
              scienceActivity: {} as Record<string, number>,
              projectActivity: {} as Record<string, number>,
              extracurricular: {} as Record<string, number>,
            })),
            events: [],
          };
          mockStore.setExcelData(convertedData, file.name);
        }
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearImport = () => {
    mockStore.clear();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-2xl font-headline font-bold text-text-main">
            Рейтинг студентов УПИШ
          </h3>
          <p className="text-sm text-secondary">Бакалавриат 1–4 курс | Семестр: Осенний 2024</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск студентов..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-border-subtle rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex bg-surface-container-low p-1 rounded-lg border border-border-subtle">
            {courses.map((course) => (
              <button
                key={course}
                onClick={() => setActiveCourse(course)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-label transition-all",
                  activeCourse === course
                    ? "bg-surface-card shadow-sm text-primary font-semibold"
                    : "text-secondary hover:text-text-main"
                )}
              >
                {course}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <AdminOnly>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              {mockStore.parsedData ? (
                <button
                  onClick={handleClearImport}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-label border border-status-error text-status-error hover:bg-status-error/10 transition-colors"
                >
                  <Icon name="close" />
                  Сбросить
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-label border border-border-subtle text-secondary hover:text-primary hover:border-primary transition-colors"
                >
                  <Icon name="upload_file" />
                  Excel
                </button>
              )}
            </AdminOnly>
          </div>
        </div>
      </div>

      {importError && (
        <div className="bg-status-error/10 border border-status-error/30 text-status-error text-sm px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="error" />
            <span>{importError}</span>
          </div>
          <button
            onClick={() => setParsingType(parsingType === "multi" ? "simple" : "multi")}
            className="mt-1 text-xs underline hover:no-underline"
          >
            Попробовать {parsingType === "multi" ? "простой" : "сложный"} парсер
          </button>
        </div>
      )}

      {mockStore.parsedData && (
        <div className="bg-primary-fixed/20 border border-primary/30 text-primary text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <Icon name="check_circle" fill />
          Загружено {mockStore.parsedData.students.length} студентов из Excel ({mockStore.fileName})
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {!stats ? (
          isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-card p-4 rounded-lg border border-border-subtle">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          ) : error ? (
            <div className="col-span-4 text-status-error text-sm text-center py-8">
              Ошибка загрузки рейтинга
            </div>
          ) : null
        ) : (
          <>
            <div className="bg-surface-card p-4 rounded-lg border-t-4 border-primary border border-border-subtle">
              <p className="text-xs font-label text-secondary uppercase tracking-widest">
                Мое место
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-headline font-bold text-primary">
                  {stats.myPlace}
                </span>
                {stats.myPlaceChange !== 0 && (
                  <span
                    className={cn(
                      "text-xs font-semibold flex items-center",
                      stats.myPlaceChange > 0 ? "text-status-success" : "text-status-error"
                    )}
                  >
                    <Icon name="trending_up" className="text-sm" />
                    {stats.myPlaceChange > 0 ? "+" : ""}
                    {stats.myPlaceChange}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-surface-card p-4 rounded-lg border-t-4 border-text-main border border-border-subtle">
              <p className="text-xs font-label text-secondary uppercase tracking-widest">
                Топ 1 балл
              </p>
              <p className="text-3xl font-headline font-bold text-text-main mt-1">
                {formatNumber(stats.topScore)}
              </p>
            </div>
            <div className="bg-surface-card p-4 rounded-lg border-t-4 border-secondary border border-border-subtle">
              <p className="text-xs font-label text-secondary uppercase tracking-widest">
                Средний по курсу
              </p>
              <p className="text-3xl font-headline font-bold text-text-main mt-1">
                {formatNumber(stats.averageScore)}
              </p>
            </div>
            <div className="bg-primary p-4 rounded-lg border border-border-subtle flex flex-col justify-between">
              <p className="text-xs font-label text-primary-fixed uppercase tracking-widest">
                Активность
              </p>
              <div className="flex items-center justify-between text-on-primary mt-1">
                <span className="text-lg font-headline font-bold">{stats.activityLevel}</span>
                <Icon name="bolt" className="text-3xl opacity-50" />
              </div>
            </div>
          </>
        )}
      </section>

      <div className="bg-surface-card rounded-lg border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[52px]" />
              <col />
              <col className="w-[60px]" />
              <col className="w-[90px]" />
              <col className="w-[80px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[72px]" />
            </colgroup>
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase">Место</th>
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase">Студент</th>
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase text-center">
                  Курс
                </th>
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase">Группа</th>
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase text-right">
                  Учеба
                </th>
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase text-right">
                  Активность
                </th>
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase text-right">
                  Общий балл
                </th>
                <th className="px-4 py-3 text-xs font-label text-secondary uppercase text-center">
                  Динамика
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {!hasMockData && isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-12" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-secondary text-sm">
                    {searchTerm ? "Ничего не найдено" : "Нет данных"}
                  </td>
                </tr>
              ) : (
                paginated.map((student) => (
                  <tr
                    key={student.id}
                    className={cn(
                      "transition-colors",
                      student.isCurrentUser
                        ? "bg-surface-card border-2 border-primary ring-4 ring-primary-fixed/30 scale-[1.01] shadow-lg"
                        : "hover:bg-accent"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-lg font-headline font-bold",
                            student.rank === 1 ? "text-primary" : "text-text-main"
                          )}
                        >
                          {student.rank}
                        </span>
                        {student.rank === 1 && (
                          <Icon name="military_tech" fill className="text-primary" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-xs font-bold shrink-0">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 truncate">
                          <span
                            className={cn(
                              "text-sm truncate block",
                              student.isCurrentUser ? "font-bold" : "font-medium",
                              "text-text-main"
                            )}
                          >
                            {student.name}
                          </span>
                          {student.isCurrentUser && (
                            <span className="ml-2 bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                              ВЫ
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{student.course}</td>
                    <td className="px-4 py-3">
                      <span className="bg-surface-container-high px-2 py-0.5 rounded text-xs font-label font-bold uppercase tracking-tighter">
                        {student.group}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatNumber(student.academicScore)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatNumber(student.activityScore)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-headline font-bold text-primary">
                        {formatNumber(student.totalScore)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {student.trend === "up" && (
                        <div className="flex flex-col items-center text-status-success">
                          <Icon name="expand_less" />
                          {student.trendValue != null && (
                            <span className="text-[10px] font-bold">
                              +{formatNumber(student.trendValue)}
                            </span>
                          )}
                        </div>
                      )}
                      {student.trend === "down" && (
                        <div className="flex flex-col items-center text-status-error">
                          <Icon name="expand_more" />
                          {student.trendValue != null && (
                            <span className="text-[10px] font-bold">
                              {formatNumber(student.trendValue)}
                            </span>
                          )}
                        </div>
                      )}
                      {student.trend === "stable" && (
                        <Icon name="remove" className="text-secondary" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-secondary">
            {filtered.length > 0
              ? `Показаны ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} из ${filtered.length} студентов`
              : "Нет студентов"}
          </p>
          {totalPages > 1 && (
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                className="p-1 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-8 h-8 rounded border text-xs font-label font-bold transition-colors",
                    p === safePage
                      ? "border-primary bg-primary text-on-primary"
                      : "border-border-subtle bg-surface-card text-secondary hover:border-primary"
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="p-1 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_right" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
