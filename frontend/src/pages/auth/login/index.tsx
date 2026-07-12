import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/stores";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    const result = await login(groupName.trim(), password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error ?? "Ошибка входа");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 md:px-8 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="engineering" fill className="text-on-primary text-3xl sm:text-4xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-text-main">УПИШ УрФУ</h1>
          <p className="text-sm sm:text-base text-secondary mt-1">
            Инженерная школа — Система Рейтинга
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-card p-8 sm:p-10 md:p-12 rounded-2xl border border-border-subtle space-y-6 shadow-sm max-w-2xl mx-auto"
        >
          <h2 className="text-xl font-headline font-bold text-text-main text-center">
            Вход в систему
          </h2>

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
            disabled={isLoading}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl text-base hover:opacity-90 active:scale-[0.99] transition-all text-lg disabled:opacity-50"
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>

          <div className="text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-secondary hover:text-primary transition-colors underline"
            >
              Забыли пароль?
            </Link>
          </div>
        </form>

        <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-border-subtle text-center space-y-3 mt-6 max-w-2xl mx-auto">
          <p className="text-sm text-secondary">
            Для входа используйте учётные данные, выданные администратором.
          </p>
          <p className="text-xs text-secondary">
            Студенты входят по номеру студенческого билета, администратор — по логину.
          </p>
        </div>

        <p className="text-xs text-secondary text-center mt-8">
          © 2024 Уральский федеральный университет. УПИШ.
        </p>
      </div>
    </div>
  );
}
