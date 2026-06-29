import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Icon } from "@/components/ui/icon";
import { useAuthStore, MOCK_ACCOUNTS, useMockDataStore } from "@/stores";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginAs = useAuthStore((s) => s.loginAs);
  const mockStore = useMockDataStore();

  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!groupName.trim()) {
      setError("Введите логин");
      return;
    }
    if (!password.trim()) {
      setError("Введите пароль");
      return;
    }

    if (groupName.trim().toLowerCase() === "admin" && password === "1234") {
      loginAs(MOCK_ACCOUNTS[0]);
      navigate("/dashboard");
      return;
    }

    const result = login(groupName.trim(), password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error ?? "Ошибка входа");
    }
  };

  const hasExcelData = mockStore.parsedData !== null;
  const excelStudents = hasExcelData ? mockStore.getRatingStudents() : [];

  const handleStudentSelect = (name: string) => {
    const account = { id: name, name, initials: name.split(" ").map((n) => n[0]).join("").slice(0, 2), groupName: name, role: "student" as const };
    loginAs(account);
    navigate("/dashboard");
  };

  return (
    // Заменили items-start на items-center для выравнивания по центру экрана, добавили горизонтальные md:px-8
    <div className="flex min-h-screen items-center justify-center bg-background px-4 md:px-8 py-8 overflow-y-auto">
      {/* Увеличили общую ширину контейнера с max-w-xl до max-w-4xl */}
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="engineering" fill className="text-on-primary text-3xl sm:text-4xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-text-main">УПИШ УрФУ</h1>
          <p className="text-sm sm:text-base text-secondary mt-1">Инженерная школа — Система Рейтинга</p>
        </div>

        {/* Форма теперь имеет max-w-2xl вместо неявного сжатия, инпуты станут шире */}
        <form onSubmit={handleSubmit} className="bg-surface-card p-8 sm:p-10 md:p-12 rounded-2xl border border-border-subtle space-y-6 shadow-sm max-w-2xl mx-auto">
          <h2 className="text-xl font-headline font-bold text-text-main text-center">Вход в систему</h2>

          {error && (
            <div className="bg-status-error/10 border border-status-error/30 text-status-error text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <Icon name="error" className="text-base shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-label text-secondary font-semibold">Логин</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Номер группы или admin"
              // Слегка увеличили внутренние отступы py-4.5 для большего пространства внутри инпута
              className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-5 py-4 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-label text-secondary font-semibold">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-5 py-4 pr-14 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-2xl" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl text-base hover:opacity-90 active:scale-[0.99] transition-all text-lg"
          >
            Войти
          </button>

          <div className="text-center">
            <Link to="/auth/forgot-password" className="text-sm text-secondary hover:text-primary transition-colors underline">
              Забыли пароль?
            </Link>
          </div>
        </form>

        {excelStudents.length > 0 ? (
          // Блок "Быстрый вход" теперь растягивается на всю ширину max-w-4xl, p-8 для простора
          <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-border-subtle space-y-4 mt-6 max-w-4xl mx-auto">
            <h3 className="text-sm font-label text-secondary uppercase tracking-wider text-center font-semibold">Быстрый вход</h3>
            {/* max-h-64 для большей высоты, grid-cols-1 или md:grid-cols-2 по желанию, пока оставил в 1 колонку, но во всю ширину */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {excelStudents.slice(0, 20).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStudentSelect(s.name)}
                  // Увеличены px-5 py-3.5 для кнопок списка студентов
                  className="w-full text-left flex items-center gap-4 px-5 py-3.5 rounded-xl bg-surface-container-low border border-border-subtle hover:bg-surface-container-medium transition-colors text-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-sm font-bold shrink-0">
                    {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-text-main truncate font-medium text-base">{s.name}</span>
                  <span className="text-sm text-secondary ml-auto shrink-0 font-mono bg-background px-2.5 py-1 rounded-md border border-border-subtle">{s.group}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-secondary text-center pt-2">
              Пароль для всех аккаунтов: <span className="font-bold text-primary">1234</span>
            </p>
          </div>
        ) : (
          // Информационная карточка тоже расширена до max-w-2xl
          <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-border-subtle text-center space-y-3 mt-6 max-w-2xl mx-auto">
            <p className="text-sm text-secondary">
              Для входа используйте логин <span className="font-bold text-text-main">admin</span> и пароль <span className="font-bold text-text-main">1234</span>
            </p>
            <p className="text-xs text-secondary">
              После загрузки Excel на странице рейтинга появятся аккаунты студентов
            </p>
          </div>
        )}

        <p className="text-xs text-secondary text-center mt-8">
          © 2024 Уральский федеральный университет. УПИШ.
        </p>
      </div>
    </div>
  );
}