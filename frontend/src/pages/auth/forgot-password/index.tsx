import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/ui/icon";
import { requestPasswordReset } from "@/services/security";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError("Не удалось отправить запрос. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start sm:items-center justify-center bg-background px-4 py-8 sm:py-0 overflow-y-auto">
      <div className="w-full max-w-[36rem] mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="lock_reset" fill className="text-on-primary text-3xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-text-main">
            Восстановление пароля
          </h1>
          <p className="text-sm sm:text-base text-secondary mt-1">
            Введите логин, чтобы запросить сброс пароля
          </p>
        </div>

        <div className="bg-surface-card p-8 sm:p-10 rounded-2xl border border-border-subtle shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-status-success/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="check_circle" fill className="text-status-success text-3xl" />
              </div>
              <p className="text-base text-text-main">
                Запрос на сброс пароля отправлен. Если учётная запись существует, вы получите
                инструкции.
              </p>
              <Link
                to="/auth/login"
                className="inline-block text-sm text-primary font-semibold hover:underline"
              >
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-status-error/10 border border-status-error/30 text-status-error text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-label text-secondary font-semibold">
                  Логин / группа
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Номер студенческого или admin"
                  className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-5 py-4 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl text-base hover:opacity-90 active:scale-[0.99] transition-all text-lg disabled:opacity-50"
              >
                {isLoading ? "Отправка..." : "Отправить"}
              </button>
              <div className="text-center">
                <Link
                  to="/auth/login"
                  className="text-sm text-secondary hover:text-primary transition-colors underline"
                >
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
