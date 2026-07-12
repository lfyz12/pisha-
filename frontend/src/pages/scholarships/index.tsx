import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { StudentSelect } from "@/components/student-select";
import { useScholarshipStore, useAuthStore, useMockDataStore } from "@/stores";
import { formatNumber, cn } from "@/lib/utils";
import type { ScholarshipOffer } from "@/types";

const typeIcons: Record<ScholarshipOffer["type"], string> = {
  academic: "school",
  enhanced: "emoji_events",
  achievement: "stars",
};

function ruScoreLabel(score: number): string {
  if (score % 1 !== 0) return "балла";
  const mod10 = score % 10;
  const mod100 = score % 100;
  if (mod10 === 1 && mod100 !== 11) return "балл";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "балла";
  return "баллов";
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}

export default function ScholarshipsPage() {
  const offers = useScholarshipStore((s) => s.offers);
  const loading = useScholarshipStore((s) => s.loading);
  const error = useScholarshipStore((s) => s.error);
  const fetch = useScholarshipStore((s) => s.fetch);

  const currentUser = useAuthStore((s) => s.currentUser);
  const mockStore = useMockDataStore();
  const students = mockStore.parsedData ? mockStore.getRatingStudents() : [];
  const currentStudent = students.find((s) => s.isCurrentUser);
  const isAdmin = currentUser?.role === "admin";

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const targetStudent = isAdmin
    ? selectedStudentId
      ? students.find((s) => s.id === selectedStudentId)
      : null
    : currentStudent;

  const studentScore = targetStudent?.totalScore ?? 0;

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-main">
          {isAdmin ? "Стипендии студентов" : "Мои стипендии"}
        </h1>
        <p className="text-sm text-secondary mt-1">
          {isAdmin
            ? "Проверьте доступные стипендии для выбранного студента"
            : "Проверьте доступные стипендии на основе вашего рейтинга"}
        </p>
      </div>

      {isAdmin && (
        <div className="bg-surface-card rounded-xl border border-border-subtle p-4 sm:p-6">
          <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-3">
            Выберите студента
          </label>
          <StudentSelect
            students={students}
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            placeholder="Выберите студента для просмотра стипендий"
          />
        </div>
      )}

      {isAdmin && !selectedStudentId ? (
        <div className="text-center py-12 text-secondary text-sm">
          {students.length > 0
            ? "Выберите студента, чтобы увидеть доступные ему стипендии"
            : "Загрузите данные на странице рейтинга"}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-card rounded-xl border border-border-subtle p-5 space-y-4 animate-pulse"
            >
              <div className="h-5 w-32 bg-surface-container-high rounded" />
              <div className="h-4 w-24 bg-surface-container-high rounded" />
              <div className="h-12 w-full bg-surface-container-high rounded" />
              <div className="h-2 w-full bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-status-error text-sm">{error}</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 text-secondary text-sm">Нет доступных стипендий</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => {
            const isAvailable = studentScore >= offer.requiredScore;
            const progressPct = Math.min(
              100,
              Math.round((studentScore / offer.requiredScore) * 100)
            );
            const diff = offer.requiredScore - studentScore;

            return (
              <div
                key={offer.id}
                className={cn(
                  "bg-surface-card rounded-xl border transition-all flex flex-col",
                  isAvailable ? "border-status-success/30" : "border-border-subtle"
                )}
              >
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
                      <Icon name={typeIcons[offer.type]} className="text-primary text-xl" />
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2",
                        isAvailable
                          ? "bg-status-success/10 text-status-success"
                          : "bg-surface-container-high text-text-muted"
                      )}
                    >
                      {offer.type === "academic"
                        ? "Базовая"
                        : offer.type === "enhanced"
                          ? "Повышенная"
                          : "За достижения"}
                    </span>
                  </div>

                  <h3 className="text-base font-headline font-bold text-text-main mb-1">
                    {offer.title}
                  </h3>

                  <div className="text-xl font-headline font-bold text-primary mb-2">
                    {formatAmount(offer.amount)}
                    <span className="text-xs font-normal text-secondary ml-1">/мес</span>
                  </div>

                  <p className="text-xs text-secondary leading-relaxed mb-4 flex-1">
                    {offer.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary">Минимальный рейтинг</span>
                      <span className="font-semibold text-text-main">{offer.requiredScore}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary">Ваш рейтинг</span>
                      <span
                        className={cn(
                          "font-semibold",
                          isAvailable ? "text-status-success" : "text-text-main"
                        )}
                      >
                        {formatNumber(studentScore)}
                      </span>
                    </div>
                  </div>

                  {!isAvailable && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-secondary">Прогресс</span>
                        <span className="font-semibold text-text-main">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "rounded-lg p-3 text-center text-sm font-semibold",
                      isAvailable
                        ? "bg-status-success/10 text-status-success"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {isAvailable ? (
                      <span>Поздравляем! Вы можете претендовать на эту стипендию.</span>
                    ) : (
                      <span>
                        Вам не хватает {formatNumber(diff)} {ruScoreLabel(diff)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
