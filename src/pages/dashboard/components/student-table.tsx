import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminOnly } from "@/components/admin-only";
import { useStudents, useUpdateStudentRating } from "@/hooks";
import { useMockDataStore } from "@/stores";
import { parseRatingExcel } from "@/lib/parse-rating-excel";
import { importExcelFromFile, type ImportResult } from "@/lib/import-excel";
import type { Student } from "@/types";

export function StudentTableSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  const mockStore = useMockDataStore();
  const hasMockData = mockStore.parsedData !== null;
  const mockStudents: Student[] = hasMockData ? mockStore.getStudents() : [];

  const { data, isLoading, error } = useStudents({ page: 1, pageSize: 10 });
  const updateRating = useUpdateStudentRating();
  const students: Student[] = hasMockData ? mockStudents : (data?.data ?? []);

  const handleRatingChange = (id: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 5) {
      updateRating.mutate({ id, rating: num });
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    try {
      const data = await parseRatingExcel(file);
      mockStore.setExcelData(data, file.name);
    } catch {
      try {
        const result = await importExcelFromFile(file);
        if ("students" in result && "stats" in result) {
          const simpleResult = result as ImportResult;
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
      } catch {
        setImportError("Не удалось прочитать Excel-файл");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="xl:col-span-2 bg-surface-card rounded-lg border border-border-subtle shadow-sm overflow-hidden">
      <AdminOnly>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelImport}
          className="hidden"
        />
      </AdminOnly>
      <div className="p-lg border-b border-border-subtle flex justify-between items-center">
        <h3 className="text-[--text-headline-sm] font-headline-sm">База данных студентов</h3>
        <div className="flex items-center gap-2">
          {importError && <span className="text-status-error text-xs">{importError}</span>}
          <AdminOnly>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-secondary-container text-text-main px-md py-sm rounded text-[--text-label-md] font-label-md flex items-center space-x-sm hover:bg-surface-container-highest transition-colors"
            >
              <Icon name="upload" className="text-sm" />
              <span>Импорт .xlsx</span>
            </button>
          </AdminOnly>
          {hasMockData && (
            <AdminOnly>
              <button
                onClick={() => mockStore.clear()}
                className="text-status-error text-xs font-label underline hover:no-underline"
              >
                Сбросить
              </button>
            </AdminOnly>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low text-[--text-label-md] text-secondary uppercase tracking-widest border-b border-border-subtle">
            <tr>
              <th className="px-lg py-md font-medium">ФИО Студента</th>
              <th className="px-lg py-md font-medium">ID</th>
              <th className="px-lg py-md font-medium">Курс</th>
              <th className="px-lg py-md font-medium">Рейтинг</th>
              <AdminOnly>
                <th className="px-lg py-md font-medium">Действие</th>
              </AdminOnly>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {hasMockData ? (
              mockStudents.map((student) => (
                <tr key={student.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-lg py-md">
                    <div className="flex items-center space-x-md">
                      <div className="w-8 h-8 bg-secondary-fixed rounded-full flex items-center justify-center text-xs font-bold">
                        {student.initials}
                      </div>
                      <span className="text-[--text-body-md] font-medium">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md text-[--text-body-sm] text-secondary font-mono">
                    {student.studentId}
                  </td>
                  <td className="px-lg py-md text-[--text-body-sm]">{student.course} Курс</td>
                  <td className="px-lg py-md font-bold text-primary">{student.rating}</td>
                  <AdminOnly>
                    <td className="px-lg py-md">
                      <input
                        className="w-16 bg-transparent border border-border-subtle rounded px-2 py-1 text-sm font-bold text-primary focus:outline-none focus:border-primary"
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
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-lg py-md">
                    <div className="flex items-center space-x-md">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="px-lg py-md"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-lg py-md"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-lg py-md"><Skeleton className="h-4 w-10" /></td>
                  <AdminOnly><td className="px-lg py-md"><Skeleton className="h-4 w-4" /></td></AdminOnly>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-lg py-md text-center text-status-error">
                  Ошибка загрузки данных
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-lg py-md text-center text-secondary">
                  Нет данных
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-lg py-md">
                    <div className="flex items-center space-x-md">
                      <div className="w-8 h-8 bg-secondary-fixed rounded-full flex items-center justify-center text-xs font-bold">
                        {student.initials}
                      </div>
                      <span className="text-[--text-body-md] font-medium">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md text-[--text-body-sm] text-secondary font-mono">
                    {student.studentId}
                  </td>
                  <td className="px-lg py-md text-[--text-body-sm]">{student.course} Курс</td>
                  <td className="px-lg py-md font-bold text-primary">{student.rating}</td>
                  <AdminOnly>
                    <td className="px-lg py-md">
                      <input
                        className="w-16 bg-transparent border border-border-subtle rounded px-2 py-1 text-sm font-bold text-primary focus:outline-none focus:border-primary"
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
    </div>
  );
}
