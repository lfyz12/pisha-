import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { AdminOnly } from "@/components/admin-only";
import { useScoringLogs, useCreateScoring, useStudents } from "@/hooks";
import { useMockDataStore } from "@/stores";
import type { ScoringLog, Student } from "@/types";

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}

export function ScoringFormSection() {
  const [activityType, setActivityType] = useState("Хакатон");
  const [points, setPoints] = useState("");
  const [participantCount, setParticipantCount] = useState("1");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const { data: logsData, isLoading: logsLoading } = useScoringLogs();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ page: 1, pageSize: 100 });
  const createScoring = useCreateScoring();

  const mockStore = useMockDataStore();
  const mockStudents: Student[] = mockStore.parsedData ? mockStore.getStudents() : [];

  const logs: ScoringLog[] = logsData?.data ?? [];
  const students: Student[] = mockStudents.length > 0 ? mockStudents : (studentsData?.data ?? []);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createScoring.mutate({
      activityType,
      points: parseInt(points) || 0,
      participantCount: parseInt(participantCount) || 1,
      studentIds: selectedStudents,
    });
  };

  return (
    <AdminOnly>
      <div className="bg-surface-card p-xl rounded-lg border border-border-subtle shadow-sm flex flex-col">
        <h3 className="text-[--text-headline-sm] font-headline-sm mb-lg">Начисление баллов</h3>
        <form className="space-y-md flex-1" onSubmit={handleSubmit}>
          <div>
            <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
              Тип активности
            </label>
            <select
              className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-sm bg-surface-container-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
            >
              <option>Хакатон</option>
              <option>Научная публикация</option>
              <option>Проектная работа</option>
              <option>Волонтерство</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
                Баллы
              </label>
              <input
                className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-sm bg-surface-container-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="0"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
                К-во участников
              </label>
              <input
                className="w-full border border-border-subtle rounded-lg px-3 py-2.5 text-sm bg-surface-container-low focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="1"
                type="number"
                value={participantCount}
                onChange={(e) => setParticipantCount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[--text-label-md] text-secondary block mb-[--spacing-xs]">
              Выбор студентов
            </label>
            <div className="border border-border-subtle rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto bg-surface-container-low">
              {studentsLoading && mockStudents.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : students.length === 0 ? (
                <span className="text-sm text-secondary px-2 py-1.5 block">Нет студентов</span>
              ) : (
                students.map((student) => (
                  <label key={student.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container-lowest cursor-pointer text-sm transition-colors">
                    <input
                      className="rounded text-primary focus:ring-primary accent-primary"
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                    />
                    <span>{student.name}</span>
                  </label>
                ))
              )}
              {mockStudents.length > 0 && (
                <div className="border-t border-border-subtle pt-1 mt-1 px-2">
                  <span className="text-[10px] text-secondary">Загружено из Excel: {mockStudents.length} студентов</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={createScoring.isPending || selectedStudents.length === 0}
            className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {createScoring.isPending ? (
              <>Отправка...</>
            ) : (
              <>
                <Icon name="how_to_reg" className="text-lg" />
                Начислить {selectedStudents.length} студентам
              </>
            )}
          </button>
        </form>

        <div className="mt-xl pt-lg border-t border-border-subtle">
          <h4 className="text-xs font-bold mb-3 uppercase tracking-widest text-secondary">
            Лог начислений
          </h4>
          <div className="space-y-1.5 text-sm">
            {logsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : logs.length === 0 ? (
              <span className="text-secondary text-xs">Нет записей</span>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex justify-between items-center py-1">
                  <span className="text-status-success text-xs">
                    {log.activityType} (+{log.points})
                  </span>
                  <span className="text-[10px] text-secondary">{formatTimeAgo(log.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}
