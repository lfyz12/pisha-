import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminOnly } from "@/components/admin-only";
import { useStudents, useUpdateStudentRating, useUpdateStudentStatus } from "@/hooks";
import { cn, formatNumber } from "@/lib/utils";
import type { Student, StudentStatus } from "@/types";

const PAGE_SIZES = [10, 30, 50, 100];

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Активен",
  at_risk: "В группе риска",
  top_reserve: "Топ-резерв",
  expelled: "Отчислен",
};

export function StudentTableSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useStudents({ page: 1, pageSize: 10 });
  const updateRating = useUpdateStudentRating();
  const updateStatus = useUpdateStudentStatus();
  const students = useMemo<Student[]>(() => data?.data ?? [], [data]);

  const filtered = useMemo(() => {
    if (!searchTerm) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        String(s.course).includes(q)
    );
  }, [students, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = page > totalPages ? 1 : page;
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleRatingChange = (id: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 5) {
      updateRating.mutate({ id, rating: num });
    }
  };

  const handleStatusChange = (id: string, value: string) => {
    const status = value as StudentStatus;
    updateStatus.mutate({ id, status });
  };

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
    <div className="xl:col-span-2 bg-surface-card rounded-lg border border-border-subtle shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border-subtle flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-sm font-headline font-bold">База данных студентов</h3>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-40">
            <Icon
              name="search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-xs"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-7 pr-2 py-1.5 bg-surface-container-low border border-border-subtle rounded text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left table-fixed">
          <colgroup>
            <col />
            <col className="w-[100px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <AdminOnly>
              <col className="w-[90px]" />
            </AdminOnly>
          </colgroup>
          <thead className="bg-surface-container-low text-[11px] text-secondary uppercase tracking-widest border-b border-border-subtle sticky top-0 z-10">
            <tr>
              <th className="px-3 sm:px-4 py-3 font-medium">ФИО Студента</th>
              <th className="px-3 sm:px-4 py-3 font-medium">ID</th>
              <th className="px-3 sm:px-4 py-3 font-medium">Курс</th>
              <th className="px-3 sm:px-4 py-3 font-medium text-center">Рейтинг</th>
              <th className="px-3 sm:px-4 py-3 font-medium text-center">Статус</th>
              <AdminOnly>
                <th className="px-3 sm:px-4 py-3 font-medium text-center">Действие</th>
              </AdminOnly>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
                      <Skeleton className="h-4 w-24 sm:w-32" />
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-12 sm:w-16" />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-10 sm:w-12" />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-8 sm:w-10" />
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-20 sm:w-24" />
                  </td>
                  <AdminOnly>
                    <td className="px-3 sm:px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  </AdminOnly>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-status-error text-sm">
                  Ошибка загрузки данных
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-secondary text-sm">
                  {searchTerm ? "Ничего не найдено" : "Нет данных"}
                </td>
              </tr>
            ) : (
              paginated.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-surface-container-low transition-colors group"
                >
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-secondary-fixed rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                        {student.initials}
                      </div>
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-secondary font-mono truncate">
                    {student.studentId}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">{student.course} Курс</td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-primary text-center">
                    {formatNumber(student.rating)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-center">
                    <AdminOnly>
                      <select
                        value={student.status}
                        onChange={(e) => handleStatusChange(student.id, e.target.value)}
                        disabled={updateStatus.isPending}
                        className="bg-surface-container-low border border-border-subtle rounded px-2 py-1 text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </AdminOnly>
                    <span className="sm:hidden">{STATUS_LABELS[student.status]}</span>
                  </td>
                  <AdminOnly>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <input
                        className="w-14 sm:w-16 bg-transparent border border-border-subtle rounded px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-bold text-primary focus:outline-none focus:border-primary text-center"
                        type="number"
                        defaultValue={student.rating}
                        step={0.1}
                        min={0}
                        max={5}
                        onBlur={(e) => handleRatingChange(student.id, e.target.value)}
                      />
                    </td>
                  </AdminOnly>
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
            <div key={student.id} className="p-4 hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-secondary-fixed rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {student.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{student.name}</div>
                  <div className="text-xs text-secondary font-mono">{student.studentId}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-surface-container-low rounded-lg py-2 px-1">
                  <div className="text-[10px] text-secondary uppercase font-label">Курс</div>
                  <div className="text-sm font-semibold">{student.course}</div>
                </div>
                <div className="bg-surface-container-low rounded-lg py-2 px-1">
                  <div className="text-[10px] text-secondary uppercase font-label">Рейтинг</div>
                  <div className="text-sm font-bold text-primary">
                    {formatNumber(student.rating)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-surface-container-low px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <p className="text-xs text-secondary">
            {filtered.length > 0
              ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} из ${filtered.length}`
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
              className="p-1 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="first_page" />
            </button>
            <button
              onClick={() => setPage(safePage - 1)}
              disabled={safePage <= 1}
              className="p-1 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="chevron_left" />
            </button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span
                  key={`e${i}`}
                  className="w-6 h-6 flex items-center justify-center text-xs text-secondary"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-6 h-6 rounded border text-[10px] font-label font-bold transition-colors",
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
              className="p-1 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="chevron_right" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage >= totalPages}
              className="p-1 rounded border border-border-subtle bg-surface-card text-secondary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="last_page" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
