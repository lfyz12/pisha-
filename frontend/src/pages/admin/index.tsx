import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useUploadExcel } from "@/hooks";
import {
  consumeCredentialBundle,
  getAccessPolicy,
  type AccessPolicy,
  updateAccessPolicy,
} from "@/services/security";

export default function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const uploadExcel = useUploadExcel();
  const summary = uploadExcel.data?.data;
  const [policy, setPolicy] = useState<AccessPolicy | null>(null);
  const [policyError, setPolicyError] = useState("");
  const [credentialError, setCredentialError] = useState("");

  useEffect(() => {
    getAccessPolicy()
      .then((response) => setPolicy(response.data))
      .catch(() => setPolicyError("Не удалось загрузить политику доступа"));
  }, []);

  const togglePolicy = async (key: keyof AccessPolicy) => {
    if (!policy) return;
    const previous = policy;
    const next = { ...policy, [key]: !policy[key] };
    setPolicy(next);
    try {
      const response = await updateAccessPolicy({ [key]: next[key] });
      setPolicy(response.data);
    } catch {
      setPolicy(previous);
      setPolicyError("Не удалось сохранить политику доступа");
    }
  };

  const downloadCredentials = async () => {
    if (!summary?.credentialBundleId) return;
    setCredentialError("");
    try {
      const response = await consumeCredentialBundle(summary.credentialBundleId);
      const csvCell = (value: string) => {
        const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
        return `"${safeValue.replaceAll('"', '""')}"`;
      };
      const rows = [
        "student_id,temporary_password",
        ...response.data.credentials.map(
          ({ studentId, temporaryPassword }) =>
            `${csvCell(studentId)},${csvCell(temporaryPassword)}`
        ),
      ];
      const url = URL.createObjectURL(
        new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "pisha-temporary-credentials.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setCredentialError("Файл реквизитов уже получен или срок его действия истёк");
    }
  };

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

      <section className="border border-border-subtle bg-surface-card p-6 rounded-xl space-y-4">
        <div>
          <h2 className="text-sm font-headline font-bold">Доступ студентов</h2>
          <p className="text-xs text-secondary mt-1">
            Настройки применяются сервером ко всем запросам студентов.
          </p>
        </div>
        {policyError && <p className="text-xs text-status-error">{policyError}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {policy &&
            [
              ["show_names_in_rating", "Показывать ФИО в общем рейтинге"],
              ["allow_other_profiles", "Разрешать чужие профили"],
              ["allow_other_attendance", "Показывать чужую посещаемость"],
              ["allow_other_activities", "Показывать чужую активность"],
              ["allow_scoring_logs", "Разрешать журнал начислений"],
              ["allow_ai_rules", "Разрешать просмотр AI-правил"],
              ["allow_global_notifications", "Показывать системные уведомления"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={policy[key as keyof AccessPolicy]}
                  onChange={() => togglePolicy(key as keyof AccessPolicy)}
                />
                {label}
              </label>
            ))}
        </div>
      </section>

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
            accept=".xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />

          {importError && (
            <div className="bg-status-error/10 text-status-error text-xs px-3 py-2 rounded-lg">
              {importError}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadExcel.isPending}
            className="w-full bg-primary text-on-primary font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon name={uploadExcel.isPending ? "hourglass_empty" : "upload"} className="text-lg" />
            {uploadExcel.isPending ? "Импорт..." : "Выбрать файл"}
          </button>

          {summary && (
            <div className="space-y-2">
              <div className="bg-primary-fixed/20 text-primary text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                <Icon name="check_circle" fill />
                Импортировано {summary.studentsImported} студентов
                {summary.eventsImported > 0 && ` и ${summary.eventsImported} мероприятий`}
              </div>
              {summary.credentialBundleId && (
                <button
                  onClick={downloadCredentials}
                  className="w-full border border-primary text-primary font-bold py-2.5 rounded-lg text-sm"
                >
                  Скачать временные реквизиты
                </button>
              )}
              {credentialError && <p className="text-xs text-status-error">{credentialError}</p>}
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
