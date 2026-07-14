import { useState, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { useUploadExcel } from "@/hooks";

export default function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const uploadExcel = useUploadExcel();
  const summary = uploadExcel.data?.data;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    uploadExcel.mutate(
      { file },
      {
        onError: (err) => {
          setImportError(err instanceof Error ? err.message : "Не удалось прочитать Excel-файл");
        },
      }
    );
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
            <div className="bg-status-error/10 text-status-error text-xs px-3 py-2 rounded-lg">
              {importError}
            </div>
          )}

          <button
            id="excel-uploader"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadExcel.isPending}
            className="w-full bg-primary text-on-primary font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon name={uploadExcel.isPending ? "hourglass_empty" : "upload"} className="text-lg" />
            {uploadExcel.isPending ? "Импорт..." : "Выбрать файл"}
          </button>

          {summary && (
            <div
              id="credential-bundle"
              className="bg-primary-fixed/20 text-primary text-sm px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <Icon name="check_circle" fill />
              Импортировано {summary.studentsImported} студентов
              {summary.eventsImported > 0 && ` и ${summary.eventsImported} мероприятий`}
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
              <span className="text-secondary">Последний импорт</span>
              <span className="font-bold">
                {summary ? `${summary.studentsImported} студентов` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Статус</span>
              <span className="font-bold">
                {uploadExcel.isPending ? "Обработка..." : summary ? "Готово" : "Нет данных"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
