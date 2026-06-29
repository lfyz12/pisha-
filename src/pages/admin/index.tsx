import { useState, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { useMockDataStore } from "@/stores";
import { parseRatingExcel } from "@/lib/parse-rating-excel";
import { importExcelFromFile, type ImportResult } from "@/lib/import-excel";

export default function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const mockStore = useMockDataStore();
  const hasData = mockStore.parsedData !== null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-main">Управление данными</h1>
        <p className="text-sm text-secondary mt-1">Импорт и управление данными студентов</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-card rounded-xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center">
              <Icon name="upload_file" className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-headline font-bold">Импорт Excel</h3>
              <p className="text-xs text-secondary">Загрузите рейтинг студентов из .xlsx файла</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          {importError && (
            <div className="bg-status-error/10 text-status-error text-xs px-3 py-2 rounded-lg">{importError}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-primary text-on-primary font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="upload" className="text-lg" />
              Выбрать файл
            </button>
            {hasData && (
              <button
                onClick={() => mockStore.clear()}
                className="px-4 py-2.5 border border-status-error text-status-error rounded-lg text-sm font-semibold hover:bg-status-error/10 transition-all"
              >
                Очистить
              </button>
            )}
          </div>

          {hasData && (
            <div className="bg-primary-fixed/20 text-primary text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <Icon name="check_circle" fill />
              Загружено {mockStore.parsedData?.students.length ?? 0} студентов
            </div>
          )}
        </div>

        <div className="bg-surface-card rounded-xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center">
              <Icon name="info" className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-headline font-bold">Статистика системы</h3>
              <p className="text-xs text-secondary">Основные показатели</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Студентов в БД</span>
              <span className="font-bold">{hasData ? mockStore.getStudents().length : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Excel загружен</span>
              <span className="font-bold">{hasData ? "Да" : "Нет"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Файл</span>
              <span className="font-bold text-xs truncate max-w-[180px]">{mockStore.fileName ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
