import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatNumber, cn } from "@/lib/utils";
import type { RatingStudent } from "@/types";

interface Props {
  students: RatingStudent[];
  activeCourse: string;
}

const PAGE_SIZES = [30, 50, 100];

export function StudentRatingTable({ students, activeCourse }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase().trim();
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
    <section className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-headline font-bold text-text-main">
            Таблица студентов
            {activeCourse !== "Все" && (
              <span className="text-xs font-normal text-secondary ml-2">({activeCourse})</span>
            )}
          </h3>
          <div className="relative w-full sm:w-48">
            <Icon
              name="search"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-sm"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-border-subtle rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-secondary">
          <Icon name="search_off" className="text-2xl mb-2" />
          <span className="text-sm">Студенты не найдены</span>
        </div>
      ) : (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead className="bg-surface-container-low text-[11px] text-secondary uppercase tracking-widest border-b border-border-subtle sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3.5 font-medium w-12 text-center">#</th>
                  <th className="px-4 py-3.5 font-medium">ФИО</th>
                  <th className="px-4 py-3.5 font-medium w-28">Группа</th>
                  <th className="px-4 py-3.5 font-medium w-20 text-center">Учеба</th>
                  <th className="px-4 py-3.5 font-medium w-20 text-center">Активность</th>
                  <th className="px-4 py-3.5 font-medium w-20 text-center">Баллы</th>
                  <th className="px-4 py-3.5 font-medium w-20 text-center">Динамика</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-bold font-mono ${
                          s.rank <= 3 ? "text-primary" : "text-secondary"
                        }`}
                      >
                        {s.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-secondary-fixed rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {s.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{s.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">{s.group}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold">{formatNumber(s.academicScore)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold">{formatNumber(s.activityScore)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-primary">
                        {formatNumber(s.totalScore)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.trendValue != null && s.trendValue !== 0 ? (
                        <span
                          className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                            s.trend === "up" ? "text-status-success" : "text-status-error"
                          }`}
                        >
                          <Icon
                            name={s.trend === "up" ? "arrow_upward" : "arrow_downward"}
                            className="text-sm"
                          />
                          {s.trendValue}
                        </span>
                      ) : (
                        <span className="text-xs text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border-subtle">
            {paginated.map((s) => (
              <div key={s.id} className="p-4 hover:bg-surface-container-low transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        s.rank <= 3
                          ? "bg-primary text-on-primary"
                          : "bg-secondary-fixed text-text-main"
                      }`}
                    >
                      {s.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-xs text-secondary">{s.group}</div>
                    </div>
                  </div>
                  {s.trendValue != null && s.trendValue !== 0 && (
                    <span
                      className={`shrink-0 inline-flex items-center gap-0.5 text-xs font-bold ${
                        s.trend === "up" ? "text-status-success" : "text-status-error"
                      }`}
                    >
                      <Icon
                        name={s.trend === "up" ? "arrow_upward" : "arrow_downward"}
                        className="text-sm"
                      />
                      {s.trendValue}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface-container-low rounded-lg py-2 px-1">
                    <div className="text-[10px] text-secondary uppercase font-label">Учеба</div>
                    <div className="text-sm font-semibold">{formatNumber(s.academicScore)}</div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg py-2 px-1">
                    <div className="text-[10px] text-secondary uppercase font-label">
                      Активность
                    </div>
                    <div className="text-sm font-semibold">{formatNumber(s.activityScore)}</div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg py-2 px-1">
                    <div className="text-[10px] text-secondary uppercase font-label">Баллы</div>
                    <div className="text-sm font-bold text-primary">
                      {formatNumber(s.totalScore)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-container-low px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-subtle">
            <div className="flex items-center gap-3">
              <p className="text-xs text-secondary">
                {`Показаны ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} из ${filtered.length} студентов`}
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
        </>
      )}
    </section>
  );
}
