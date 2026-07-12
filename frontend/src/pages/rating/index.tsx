import { useState, useRef, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminOnly } from "@/components/admin-only";
import { useRatingTable, useUploadExcel } from "@/hooks";
import type { RatingStudent, RatingStats } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

const courses = ["Все", "1 курс", "2 курс", "3 курс", "4 курс"];
const PAGE_SIZES = [10, 30, 50, 100];

export default function RatingPage() {
  const [activeCourse, setActiveCourse] = useState("3 курс");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const courseParam = activeCourse === "Все" ? undefined : parseInt(activeCourse);
  const { data, isLoading, error } = useRatingTable(courseParam);
  const uploadExcel = useUploadExcel();

  const rawStudents = data?.data?.students;
  const students: RatingStudent[] = useMemo(() => rawStudents ?? [], [rawStudents]);
  const stats: RatingStats | undefined = data?.data?.stats;

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = page > totalPages ? 1 : page;
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    uploadExcel.mutate(
      { file },
      {
        onError: (err) => {
          setImportError(err instanceof Error ? err.message : "Неизвестная ошибка импорта");
        },
      }
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const importSummary = uploadExcel.data?.data;

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <h3 className="text-lg sm:text-2xl font-headline font-bold text-text-main">
            Рейтинг студентов УПИШ
          </h3>
          <p className="text-xs sm:text-sm text-secondary">
            Бакалавриат 1–4 курс | Семестр: Осенний 2024
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:w-56">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск студентов..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-border-subtle rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex bg-surface-container-low p-1 rounded-lg border border-border-subtle overflow-x-auto">
            {courses.map((course) => (
              <button
                key={course}
                onClick={() => setActiveCourse(course)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-lg text-xs font-label transition-all whitespace-nowrap",
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
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadExcel.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-label border border-border-subtle text-secondary hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
              >
                <Icon name={uploadExcel.isPending ? "hourglass_empty" : "upload_file"} />
                {uploadExcel.isPending ? "Импорт..." : "Excel"}
              </button>
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
        </div>
      )}

      {importSummary && (
        <div className="bg-primary-fixed/20 border border-primary/30 text-primary text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <Icon name="check_circle" fill />
          Импортировано {importSummary.studentsImported} студентов
          {importSummary.eventsImported > 0 && ` и ${importSummary.eventsImported} мероприятий`}
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {!stats ? (
          isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-card p-3 sm:p-4 rounded-lg border border-border-subtle"
              >
                <Skeleton className="h-3 w-16 sm:w-20 mb-2" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
              </div>
            ))
          ) : error ? (
            <div className="col-span-4 text-status-error text-sm text-center py-8">
              Ошибка загрузки рейтинга
            </div>
          ) : null
        ) : (
          <>
            <div className="bg-surface-card p-3 sm:p-4 rounded-lg border-t-4 border-primary border border-border-subtle">
              <p className="text-[10px] sm:text-xs font-label text-secondary uppercase tracking-widest">
                Мое место
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-headline font-bold text-primary">
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
            <div className="bg-surface-card p-3 sm:p-4 rounded-lg border-t-4 border-text-main border border-border-subtle">
              <p className="text-[10px] sm:text-xs font-label text-secondary uppercase tracking-widest">
                Топ 1 (средний балл)
              </p>
              <p className="text-2xl sm:text-3xl font-headline font-bold text-text-main mt-1">
                {formatNumber(
                  students.length > 0 ? Math.max(...students.map((s) => s.academicScore)) : 0
                )}
              </p>
            </div>
            <div className="bg-surface-card p-3 sm:p-4 rounded-lg border-t-4 border-secondary border border-border-subtle">
              <p className="text-[10px] sm:text-xs font-label text-secondary uppercase tracking-widest">
                Средний по курсу
              </p>
              <p className="text-2xl sm:text-3xl font-headline font-bold text-text-main mt-1">
                {formatNumber(
                  students.length > 0
                    ? students.reduce((acc, s) => acc + s.academicScore, 0) / students.length
                    : 0
                )}
              </p>
            </div>
            <div className="bg-primary p-3 sm:p-4 rounded-lg border border-border-subtle flex flex-col justify-between">
              <p className="text-[10px] sm:text-xs font-label text-primary-fixed uppercase tracking-widest">
                Активность
              </p>
              <div className="flex items-center justify-between text-on-primary mt-1">
                <span className="text-base sm:text-lg font-headline font-bold">
                  {stats.activityLevel}
                </span>
                <Icon name="bolt" className="text-2xl sm:text-3xl opacity-50" />
              </div>
            </div>
          </>
        )}
      </section>

      <div className="bg-surface-card rounded-lg border border-border-subtle overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase w-12">
                  Место
                </th>
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase">
                  Студент
                </th>
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase text-center w-14 sm:w-16">
                  Курс
                </th>
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase w-20 sm:w-24">
                  Группа
                </th>
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase text-right w-16 sm:w-20">
                  Учеба
                </th>
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase text-right w-16 sm:w-20">
                  Активность
                </th>
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase text-right w-20 sm:w-24">
                  Общий балл
                </th>
                <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-label text-secondary uppercase text-center w-16">
                  Динамика
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-3 sm:px-4 py-3">
                        <Skeleton className="h-4 w-10 sm:w-12" />
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
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-base sm:text-lg font-headline font-bold",
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
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 truncate">
                          <span
                            className={cn(
                              "text-xs sm:text-sm truncate block",
                              student.isCurrentUser ? "font-bold" : "font-medium",
                              "text-text-main"
                            )}
                          >
                            {student.name}
                          </span>
                          {student.isCurrentUser && (
                            <span className="ml-1 sm:ml-2 bg-primary text-on-primary text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase">
                              ВЫ
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm">
                      {student.course}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="bg-surface-container-high px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-label font-bold uppercase tracking-tighter">
                        {student.group}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">
                      {formatNumber(student.academicScore)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">
                      {formatNumber(student.activityScore)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <span className="text-base sm:text-lg font-headline font-bold text-primary">
                        {formatNumber(student.totalScore)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
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

        <div className="sm:hidden divide-y divide-border-subtle">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-secondary text-sm">
              {searchTerm ? "Ничего не найдено" : "Нет данных"}
            </div>
          ) : (
            paginated.map((student) => (
              <div
                key={student.id}
                className={cn(
                  "p-4 hover:bg-surface-container-low transition-colors",
                  student.isCurrentUser && "bg-primary-fixed/10"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        student.rank <= 3 ? "bg-primary text-on-primary" : "bg-secondary-fixed"
                      )}
                    >
                      {student.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1">
                        {student.name}
                        {student.isCurrentUser && (
                          <span className="bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">
                            ВЫ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary">
                        {student.group} • {student.course} курс
                      </div>
                    </div>
                  </div>
                  {student.trend === "up" && (
                    <span className="shrink-0 flex items-center gap-0.5 text-xs font-bold text-status-success">
                      <Icon name="arrow_upward" className="text-sm" />
                      {student.trendValue != null && `+${formatNumber(student.trendValue)}`}
                    </span>
                  )}
                  {student.trend === "down" && (
                    <span className="shrink-0 flex items-center gap-0.5 text-xs font-bold text-status-error">
                      <Icon name="arrow_downward" className="text-sm" />
                      {student.trendValue != null && formatNumber(student.trendValue)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface-container-low rounded-lg py-2 px-1">
                    <div className="text-[10px] text-secondary uppercase font-label">Учеба</div>
                    <div className="text-sm font-semibold">
                      {formatNumber(student.academicScore)}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg py-2 px-1">
                    <div className="text-[10px] text-secondary uppercase font-label">
                      Активность
                    </div>
                    <div className="text-sm font-semibold">
                      {formatNumber(student.activityScore)}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg py-2 px-1">
                    <div className="text-[10px] text-secondary uppercase font-label">Баллы</div>
                    <div className="text-sm font-bold text-primary">
                      {formatNumber(student.totalScore)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-surface-container-low px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-secondary">
              {filtered.length > 0
                ? `Показаны ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} из ${filtered.length} студентов`
                : "Нет студентов"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-secondary">По</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-surface-card border border-border-subtle rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
                className="p-1.5 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="first_page" />
              </button>
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                className="p-1.5 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_left" />
              </button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span
                    key={`e${i}`}
                    className="w-7 h-7 flex items-center justify-center text-xs text-secondary"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-7 h-7 rounded border text-xs font-label font-bold transition-colors",
                      p === safePage
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border-subtle bg-surface-card text-secondary hover:border-primary"
                    )}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_right" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="last_page" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
