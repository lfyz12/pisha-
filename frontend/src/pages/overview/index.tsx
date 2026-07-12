import { useState } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@/components/ui/icon";
import { StudentSelect } from "@/components/student-select";
import { useAuthStore, useMockDataStore } from "@/stores";
import { cn, formatNumber } from "@/lib/utils";
import type { RatingStudent } from "@/types";

export default function OverviewPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const mockStore = useMockDataStore();
  const hasData = mockStore.parsedData !== null;

  const students = hasData ? mockStore.getRatingStudents() : [];
  const stats = hasData ? mockStore.getRatingStats() : null;
  const metrics = hasData ? mockStore.getMetrics() : null;
  const top3 = students.slice(0, 3);
  const me = students.find((s) => s.isCurrentUser);
  const isAdmin = currentUser?.role === "admin";

  const [viewingStudent, setViewingStudent] = useState<RatingStudent | null>(null);

  const targetStudent = viewingStudent ?? me;
  const targetScore = targetStudent?.totalScore ?? 0;

  const rawStudents = mockStore.parsedData?.students ?? [];
  const rawTarget = targetStudent
    ? rawStudents.find((s) => s.fullName === targetStudent.name)
    : null;

  const attendPct = rawTarget
    ? Math.min(
        100,
        Math.round(
          (rawTarget.attendance.reduce((a, b) => a + b, 0) /
            Math.max(rawTarget.attendance.length, 1)) *
            100
        )
      )
    : undefined;

  const projectCount = rawTarget ? Object.keys(rawTarget.projectActivity).length : undefined;

  const rank = targetStudent?.rank ?? stats?.myPlace ?? 14;
  const totalStudents = students.length || 550;
  const myScore = targetScore;
  const maxScore = students[0]?.totalScore ?? 1000;
  const scorePercent = maxScore > 0 ? Math.round((myScore / maxScore) * 100) : 74;
  const rankPercent =
    totalStudents > 0 ? Math.round(((totalStudents - rank) / totalStudents) * 100) : 3;

  const studentName = targetStudent?.name ?? currentUser?.name ?? "Студент";
  const studentGroup = targetStudent?.group ?? currentUser?.groupName ?? "";

  return (
    <div className="space-y-8">
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-text-main">Просмотр студента:</label>
            {hasData && students.length > 0 ? (
              <div className="w-full sm:w-64">
                <StudentSelect
                  students={students}
                  value={targetStudent?.id ?? null}
                  onChange={(id) => {
                    const s = id ? students.find((st) => st.id === id) : null;
                    setViewingStudent(s ?? null);
                  }}
                  placeholder="Сводка по всем"
                  showClear={false}
                />
              </div>
            ) : (
              <span className="text-sm text-secondary">Загрузите Excel для выбора студента</span>
            )}
          </div>
          {targetStudent && (
            <button
              onClick={() => setViewingStudent(null)}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Сбросить
            </button>
          )}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 bg-surface-card p-6 rounded-xl border-t-4 border-primary flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xs font-label uppercase tracking-widest text-secondary">
                {targetStudent ? `Рейтинг: ${studentName}` : "Мой рейтинг"}
              </h3>
              <span className="bg-primary-fixed text-primary px-2 py-0.5 rounded text-xs font-bold">
                {scorePercent >= 90
                  ? "Платиновый"
                  : scorePercent >= 70
                    ? "Золотой"
                    : scorePercent >= 40
                      ? "Серебряный"
                      : "Базовый"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-headline font-bold text-primary">
                {targetStudent ? rank : isAdmin ? "—" : rank}
              </span>
              <span className="text-sm text-secondary">из {totalStudents}</span>
            </div>
            {targetStudent ? (
              <p className="text-sm text-secondary mt-1">
                {studentGroup} • {targetStudent.course} курс
              </p>
            ) : isAdmin ? (
              <p className="text-sm text-secondary mt-1">Агрегированные данные по всем студентам</p>
            ) : (
              <p className="text-sm text-secondary mt-1">
                Вы входите в топ-{rankPercent}% студентов школы
              </p>
            )}
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>
                {targetStudent
                  ? `${formatNumber(myScore)} балла`
                  : `${formatNumber(myScore)} балла`}
              </span>
              {!isAdmin && (
                <span className="text-secondary">
                  До лидера: {formatNumber(maxScore - myScore)}
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-1000"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-2 gap-4">
          <div className="bg-surface-card p-5 rounded-xl border-t-2 border-border-subtle">
            <div className="flex justify-between mb-2">
              <Icon name="grade" className="text-primary text-xl" />
              <span className="text-xs font-label text-secondary">
                {targetStudent ? "Средний балл" : isAdmin ? "Средний балл" : "Средний балл"}
              </span>
            </div>
            <div className="text-xl font-headline font-bold">
              {targetStudent
                ? formatNumber(targetStudent.academicScore)
                : isAdmin
                  ? formatNumber(metrics?.averageGpa)
                  : formatNumber(me?.academicScore)}
            </div>
            {!isAdmin && !targetStudent && (
              <div className="text-status-success text-xs font-semibold flex items-center mt-1">
                <Icon name="arrow_upward" className="text-sm" /> +0.12
              </div>
            )}
          </div>
          <div className="bg-surface-card p-5 rounded-xl border-t-2 border-border-subtle">
            <div className="flex justify-between mb-2">
              <Icon name="event_available" className="text-primary text-xl" />
              <span className="text-xs font-label text-secondary">Посещаемость</span>
            </div>
            <div className="text-xl font-headline font-bold">
              {targetStudent
                ? (attendPct ?? "—") + "%"
                : isAdmin
                  ? (metrics?.attendance ?? "—") + "%"
                  : (attendPct ?? "—") + "%"}
            </div>
            <div className="text-status-success text-xs font-semibold flex items-center mt-1">
              <Icon name="trending_up" className="text-sm" /> Стабильно
            </div>
          </div>
          <div className="bg-surface-card p-5 rounded-xl border-t-2 border-border-subtle">
            <div className="flex justify-between mb-2">
              <Icon name="architecture" className="text-primary text-xl" />
              <span className="text-xs font-label text-secondary">Проекты</span>
            </div>
            <div className="text-xl font-headline font-bold">
              {targetStudent
                ? (projectCount ?? "—")
                : isAdmin
                  ? (metrics?.projects ?? "—")
                  : (projectCount ?? "—")}
            </div>
            <div className="text-secondary text-xs font-semibold mt-1">
              {targetStudent
                ? "Текущих проектов"
                : isAdmin
                  ? "Завершены в срок"
                  : "Текущих проектов"}
            </div>
          </div>
          <div className="bg-surface-card p-5 rounded-xl border-t-2 border-border-subtle">
            <div className="flex justify-between mb-2">
              <Icon name="bolt" className="text-primary text-xl" />
              <span className="text-xs font-label text-secondary">Активность</span>
            </div>
            <div className="text-xl font-headline font-bold">
              {targetStudent
                ? formatNumber(targetStudent.activityScore)
                : formatNumber(me?.activityScore)}
            </div>
            <div className="text-primary text-xs font-semibold mt-1">
              {targetStudent
                ? targetStudent.trend === "up"
                  ? "Высокая активность"
                  : "Средняя активность"
                : stats?.activityLevel === "Высокая"
                  ? "Высокая активность"
                  : stats?.activityLevel === "Низкая"
                    ? "Низкая активность"
                    : "Средняя активность"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-surface-card rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-border-subtle flex justify-between items-center bg-surface-container-low">
            <h3 className="text-sm font-headline font-bold">Лидерборд Студентов</h3>
            <button
              onClick={() => navigate("/dashboard/rating")}
              className="text-xs font-label text-primary font-semibold hover:underline"
            >
              Показать весь рейтинг
            </button>
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left table-fixed">
              <colgroup>
                <col className="w-[60px]" />
                <col />
                <col className="w-[100px]" />
                <col className="w-[80px]" />
                <col className="w-[72px]" />
              </colgroup>
              <thead className="bg-surface-container-low text-xs text-secondary border-b border-border-subtle">
                <tr>
                  <th className="px-5 py-3 font-bold">Место</th>
                  <th className="px-5 py-3 font-bold">Студент</th>
                  <th className="px-5 py-3 font-bold">Группа</th>
                  <th className="px-5 py-3 font-bold">Баллы</th>
                  <th className="px-5 py-3 font-bold text-right">Тренд</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm">
                {hasData ? (
                  <>
                    {top3.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => isAdmin && setViewingStudent(s)}
                        className={cn(
                          "transition-colors",
                          isAdmin
                            ? "cursor-pointer hover:bg-surface-container-low"
                            : "hover:bg-surface-container-low",
                          viewingStudent?.id === s.id && "bg-primary-fixed/20"
                        )}
                      >
                        <td
                          className={cn(
                            "px-5 py-3 font-bold",
                            s.rank <= 3 ? "text-primary" : "text-secondary"
                          )}
                        >
                          {String(s.rank).padStart(2, "0")}
                        </td>
                        <td className="px-5 py-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] font-bold shrink-0">
                              {s.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <span className="font-medium truncate">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-secondary truncate">{s.group}</td>
                        <td className="px-5 py-3 font-bold">{formatNumber(s.totalScore)}</td>
                        <td className="px-5 py-3 text-right">
                          {s.trend === "up" && (
                            <Icon name="expand_less" className="text-status-success" />
                          )}
                          {s.trend === "down" && (
                            <Icon name="expand_more" className="text-status-error" />
                          )}
                          {s.trend === "stable" && (
                            <Icon name="remove" className="text-secondary" />
                          )}
                        </td>
                      </tr>
                    ))}
                    {me && !top3.find((s) => s.isCurrentUser) && (
                      <tr
                        onClick={() => isAdmin && setViewingStudent(me)}
                        className={cn("border-l-4 border-primary", isAdmin ? "cursor-pointer" : "")}
                        style={{ backgroundColor: "var(--color-primary-fixed)" }}
                      >
                        <td className="px-5 py-3 font-bold text-primary">
                          {String(me.rank).padStart(2, "0")}
                        </td>
                        <td className="px-5 py-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {me.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <span className="font-bold text-primary truncate">{me.name} (Вы)</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-primary font-medium truncate">{me.group}</td>
                        <td className="px-5 py-3 font-bold text-primary">
                          {formatNumber(me.totalScore)}
                        </td>
                        <td className="px-5 py-3 text-right text-primary">
                          {me.trend === "up" && <Icon name="expand_less" />}
                          {me.trend === "stable" && <Icon name="remove" />}
                          {me.trend === "down" && <Icon name="expand_more" />}
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-secondary text-sm">
                      {students.length === 0 ? "Загрузите данные из Excel" : "Нет данных"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden divide-y divide-border-subtle">
            {hasData ? (
              <>
                {top3.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => isAdmin && setViewingStudent(s)}
                    className={cn(
                      "p-4 hover:bg-surface-container-low transition-colors",
                      viewingStudent?.id === s.id && "bg-primary-fixed/20",
                      isAdmin && "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          s.rank <= 3 ? "bg-primary text-on-primary" : "bg-secondary-fixed"
                        )}
                      >
                        {s.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{s.name}</div>
                        <div className="text-xs text-secondary">{s.group}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary">
                          {formatNumber(s.totalScore)}
                        </div>
                        <div className="flex justify-end">
                          {s.trend === "up" && (
                            <Icon name="expand_less" className="text-status-success text-sm" />
                          )}
                          {s.trend === "down" && (
                            <Icon name="expand_more" className="text-status-error text-sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {me && !top3.find((s) => s.isCurrentUser) && (
                  <div
                    onClick={() => isAdmin && setViewingStudent(me)}
                    className={cn(
                      "p-4 border-l-4 border-primary hover:bg-surface-container-low transition-colors",
                      isAdmin && "cursor-pointer"
                    )}
                    style={{ backgroundColor: "var(--color-primary-fixed)" }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {me.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-primary truncate">
                          {me.name} (Вы)
                        </div>
                        <div className="text-xs text-primary">{me.group}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary">
                          {formatNumber(me.totalScore)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-5 py-8 text-center text-secondary text-sm">
                {students.length === 0 ? "Загрузите данные из Excel" : "Нет данных"}
              </div>
            )}
          </div>
          <div className="p-4 text-center">
            <button
              onClick={() => navigate("/dashboard/rating")}
              className="text-primary text-xs font-bold hover:underline"
            >
              Показать весь рейтинг
            </button>
          </div>
        </div>

        <div className="bg-surface-card rounded-xl p-6 border-t-2 border-border-subtle flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-secondary self-start mb-4">
            Аналитический радар
          </h3>
          <div className="w-full aspect-square relative flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="45"
                stroke="var(--color-border-subtle)"
                strokeDasharray="2 2"
                strokeWidth="0.5"
              />
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="30"
                stroke="var(--color-border-subtle)"
                strokeDasharray="2 2"
                strokeWidth="0.5"
              />
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="15"
                stroke="var(--color-border-subtle)"
                strokeDasharray="2 2"
                strokeWidth="0.5"
              />
              <path
                d="M 50 5 L 50 95 M 5 50 L 95 50 M 18.5 18.5 L 81.5 81.5 M 81.5 18.5 L 18.5 81.5"
                stroke="var(--color-border-subtle)"
                strokeWidth="0.5"
              />
              <polygon
                fill="rgba(163, 56, 0, 0.15)"
                points="50,15 80,40 70,75 50,85 20,60 15,35"
                stroke="var(--color-primary)"
                strokeWidth="1.5"
              />
            </svg>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold">
              HARD SKILLS
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold">
              АКТИВНОСТЬ
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold">
              ПРОЕКТЫ
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-[10px] font-bold">
              БАЛЛЫ
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 w-full">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded-full" />
              <span className="text-xs text-secondary">{targetStudent?.name ?? "Вы"}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-surface-container-highest rounded-full" />
              <span className="text-xs text-secondary">Среднее по школе</span>
            </div>
          </div>
        </div>
      </section>

      {!isAdmin && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-headline font-bold flex items-center gap-2">
              <Icon name="military_tech" className="text-primary" />
              Стипендии и гранты
            </h3>
            <div className="space-y-3">
              <div className="bg-surface-card p-4 rounded-lg border-l-4 border-status-success flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-surface-container rounded flex items-center justify-center">
                    <Icon name="token" className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Стипендия Яндекса</h4>
                    <p className="text-xs text-secondary">
                      Шанс получения: <span className="text-status-success font-bold">95%</span>
                    </p>
                  </div>
                </div>
                <button className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                  Подать заявку
                </button>
              </div>
              <div className="bg-surface-card p-4 rounded-lg border-l-4 border-primary flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-surface-container rounded flex items-center justify-center">
                    <Icon name="factory" className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Именная стипендия ПНТЗ</h4>
                    <p className="text-xs text-secondary">
                      Шанс получения: <span className="text-primary font-bold">72%</span>
                    </p>
                  </div>
                </div>
                <button className="bg-surface-container text-text-main px-3 py-1.5 rounded-lg text-xs font-bold border border-border-subtle">
                  Подробнее
                </button>
              </div>
              <div className="bg-surface-card p-4 rounded-lg border-l-4 border-secondary flex justify-between items-center opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-surface-container rounded flex items-center justify-center">
                    <Icon name="school" className="text-secondary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Президентский грант</h4>
                    <p className="text-xs text-secondary">Необходим рейтинг &gt; 4.9</p>
                  </div>
                </div>
                <Icon name="lock" className="text-secondary" />
              </div>
            </div>
          </div>

          <div className="bg-surface-card rounded-xl border border-border-subtle flex flex-col h-[400px]">
            <div className="p-4 border-b border-border-subtle flex items-center gap-3 bg-surface-container-lowest">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Icon name="smart_toy" fill className="text-on-primary text-lg" />
              </div>
              <div>
                <h4 className="text-xs font-bold">ИИ-Помощник УПИШ</h4>
                <p className="text-[10px] text-status-success font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-status-success rounded-full" /> ONLINE
                </p>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="flex flex-col gap-1">
                <div className="bg-surface-container-low p-2.5 rounded-lg rounded-tl-none max-w-[85%] text-sm">
                  Привет, {currentUser?.name ?? "Александр"}! Я проанализировал твой профиль. У тебя
                  отличные шансы на стипендию Яндекса в этом месяце. Хочешь подготовить документы?
                </div>
                <span className="text-[10px] text-secondary ml-1">14:02</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="bg-primary text-on-primary p-2.5 rounded-lg rounded-tr-none max-w-[85%] text-sm">
                  Да, давай подготовим. Какие данные нужны?
                </div>
                <span className="text-[10px] text-secondary mr-1">14:05</span>
              </div>
            </div>
            <div className="p-4 border-t border-border-subtle space-y-3">
              <div className="flex flex-wrap gap-2">
                <button className="px-2.5 py-1 border border-primary text-primary rounded-full text-xs hover:bg-primary-fixed transition-colors">
                  Как повысить рейтинг?
                </button>
                <button className="px-2.5 py-1 border border-primary text-primary rounded-full text-xs hover:bg-primary-fixed transition-colors">
                  Статус заявок
                </button>
              </div>
              <div className="relative">
                <input
                  className="w-full bg-surface-card border border-border-subtle rounded-lg py-2.5 pl-3 pr-16 text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="Задайте вопрос..."
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button className="text-secondary hover:text-primary transition-colors">
                    <Icon name="attach_file" className="text-lg" />
                  </button>
                  <button className="text-primary hover:opacity-80 transition-opacity">
                    <Icon name="send" className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
