import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";

import { Icon } from "@/components/ui/icon";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, nextStep, completeStep, setNextStep } = useAuthStore();
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (nextStep !== "mfa_setup_required" || otpauthUri) return;
    apiClient
      .post<{ data: { otpauthUri: string } }>("/auth/mfa/setup/")
      .then(({ data }) => setOtpauthUri(data.data.otpauthUri))
      .catch(() => setError("Не удалось подготовить двухфакторную аутентификацию"));
  }, [nextStep, otpauthUri]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = await login(
      groupName,
      password,
      nextStep === "mfa_required" ? mfaCode : undefined
    );
    if (!result.success) return setError(result.error ?? "Ошибка входа");
    if (!useAuthStore.getState().nextStep) navigate("/dashboard");
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const { data } = await apiClient.post<{ data: { nextStep: "mfa_setup_required" | null } }>(
        "/auth/password/change/",
        {
          currentPassword: password,
          newPassword,
        }
      );
      setNewPassword("");
      setNextStep(data.data.nextStep);
      if (!data.data.nextStep) {
        completeStep();
        navigate("/dashboard");
      }
    } catch {
      setError("Не удалось изменить пароль. Проверьте требования к паролю.");
    }
  };

  const confirmMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const { data } = await apiClient.post<{ data: { recoveryCodes: string[] } }>(
        "/auth/mfa/confirm/",
        { code: mfaCode }
      );
      setRecoveryCodes(data.data.recoveryCodes);
      setMfaCode("");
    } catch {
      setError("Код аутентификатора неверный");
    }
  };

  if (recoveryCodes.length) {
    return (
      <SecurityShell title="Сохраните резервные коды">
        <p>Каждый код работает один раз. Они больше не будут показаны.</p>
        <pre className="overflow-auto rounded bg-surface-container-low p-4 text-sm">
          {recoveryCodes.join("\n")}
        </pre>
        <button
          className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg"
          onClick={() => {
            completeStep();
            navigate("/dashboard");
          }}
        >
          Я сохранил коды
        </button>
      </SecurityShell>
    );
  }
  if (nextStep === "password_change_required") {
    return (
      <SecurityShell title="Смените временный пароль">
        <form className="space-y-4" onSubmit={changePassword}>
          <PasswordInput label="Новый пароль" value={newPassword} onChange={setNewPassword} />
          <button className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg">
            Сохранить пароль
          </button>
        </form>
      </SecurityShell>
    );
  }
  if (nextStep === "mfa_setup_required") {
    return (
      <SecurityShell title="Подключите Google Authenticator">
        <div className="flex justify-center rounded bg-white p-4">
          {otpauthUri && <QRCodeSVG value={otpauthUri} size={190} />}
        </div>
        <p>Отсканируйте QR-код в приложении-аутентификаторе, затем введите шестизначный код.</p>
        <form className="space-y-4" onSubmit={confirmMfa}>
          <TextInput label="Код аутентификатора" value={mfaCode} onChange={setMfaCode} />
          <button className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg">
            Подтвердить
          </button>
        </form>
      </SecurityShell>
    );
  }

  return (
    <SecurityShell title={nextStep === "mfa_required" ? "Подтвердите вход" : "Вход в систему"}>
      {error && <p className="text-status-error text-sm">{error}</p>}
      <form className="space-y-4" onSubmit={handleLogin}>
        {nextStep !== "mfa_required" && (
          <>
            <TextInput label="Логин" value={groupName} onChange={setGroupName} />
            <PasswordInput label="Пароль" value={password} onChange={setPassword} />
          </>
        )}
        {nextStep === "mfa_required" && (
          <TextInput
            label="Код аутентификатора или recovery-код"
            value={mfaCode}
            onChange={setMfaCode}
          />
        )}
        <button
          disabled={isLoading}
          className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg disabled:opacity-50"
        >
          {isLoading ? "Проверка..." : "Продолжить"}
        </button>
      </form>
      {nextStep !== "mfa_required" && (
        <Link
          to="/auth/forgot-password"
          className="block text-center text-sm text-secondary underline"
        >
          Забыли пароль?
        </Link>
      )}
    </SecurityShell>
  );
}

function SecurityShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <main className="w-[calc(100%-2rem)] max-w-[28rem] space-y-5 rounded-xl border border-border-subtle bg-surface-card p-7 shadow-sm">
        <div className="text-center">
          <Icon name="engineering" className="mx-auto text-4xl text-primary" />
          <h1 className="mt-3 text-xl font-bold">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2"
        autoComplete="username"
        required
      />
    </label>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2"
        autoComplete="current-password"
        required
      />
    </label>
  );
}
