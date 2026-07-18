import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { StudentProjectsPanel } from "@/components/student-projects-panel";
import { useAuthStore } from "@/stores";
import { useRatingData } from "@/hooks";
import { cn, formatNumber } from "@/lib/utils";

export default function ProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { rating, metrics } = useRatingData();
  const ratingStudents = rating.data?.data?.students ?? [];
  const ratingStats = rating.data?.data?.stats;
  const dashboardMetrics = metrics.data?.data;
  const currentStudent = ratingStudents.find((s) => s.isCurrentUser);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [group, setGroup] = useState(currentUser?.groupName ?? "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setEditing(false);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!password) {
      setPasswordError("Введите текущий пароль");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordError("Новый пароль должен быть не менее 4 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    setPasswordSuccess(true);
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="glass-card rounded-xl border p-4 sm:p-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="shrink-0 self-center sm:self-auto">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary flex items-center justify-center text-white text-2xl sm:text-3xl font-headline font-bold leading-none border-4 border-surface-card shadow-lg">
              {currentUser.initials}
            </div>
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left pt-0 sm:pt-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 overflow-hidden">
              <h1 className="text-2xl sm:text-3xl font-headline font-bold text-text-main break-words min-w-0">
                {currentUser.name}
              </h1>
              <span className="inline-flex self-center text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-md shrink-0 bg-inverse-surface text-inverse-on-surface">
                {isAdmin ? "Администратор" : "Студент"}
              </span>
            </div>
            <p className="text-sm sm:text-base text-secondary/70 mt-1.5">
              {isAdmin ? "Управление системой рейтинга" : `${currentUser.groupName} • УПИШ УрФУ`}
            </p>
            <div
              className={cn(
                "flex flex-wrap gap-2 mt-2 justify-center sm:justify-start",
                isAdmin && "hidden"
              )}
            >
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Рейтинг: {currentStudent?.rank ?? ratingStats?.myPlace ?? "—"}
              </span>
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Баллы: {formatNumber(currentStudent?.totalScore)}
              </span>
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Средний балл: {formatNumber(dashboardMetrics?.averageGpa)}
              </span>
              <span className="text-[10px] bg-surface-container-low px-2 py-1 rounded font-semibold text-secondary border border-border-subtle">
                Посещаемость: {dashboardMetrics?.attendance ?? "—"}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up motion-delay-100">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl border p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base sm:text-lg font-headline font-bold text-text-main">
                Личная информация
              </h2>
              <button
                onClick={() => setEditing(!editing)}
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",
                  editing
                    ? "bg-surface-container text-secondary hover:bg-surface-container-high"
                    : "bg-primary text-on-primary hover:opacity-90"
                )}
              >
                <Icon name={editing ? "close" : "edit"} className="text-sm" />
                {editing ? "Отмена" : "Редактировать"}
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-label text-secondary uppercase tracking-wider">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!editing}
                    className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-label text-secondary uppercase tracking-wider">
                    Группа
                  </label>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    disabled={!editing}
                    className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-label text-secondary uppercase tracking-wider">
                    Роль
                  </label>
                  <input
                    type="text"
                    value={isAdmin ? "Администратор" : "Студент"}
                    disabled
                    className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base opacity-60 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-label text-secondary uppercase tracking-wider">
                    ID аккаунта
                  </label>
                  <input
                    type="text"
                    value={currentUser.id}
                    disabled
                    className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base opacity-60 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-label text-secondary uppercase tracking-wider">
                  О себе
                </label>
                <textarea
                  disabled={!editing}
                  rows={3}
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                  placeholder={
                    isAdmin
                      ? "Администратор системы рейтинга УПИШ"
                      : "Студент инженерной школы УПИШ УрФУ"
                  }
                />
              </div>

              {editing && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm font-semibold text-secondary hover:bg-surface-container rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center gap-2"
                  >
                    {profileSaved ? (
                      <>
                        <Icon name="check" className="text-sm" />
                        Сохранено
                      </>
                    ) : (
                      "Сохранить"
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="glass-card rounded-xl border p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-headline font-bold text-text-main mb-5">
              Безопасность
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-label text-secondary uppercase tracking-wider">
                  Текущий пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="****"
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-label text-secondary uppercase tracking-wider">
                  Новый пароль
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Не менее 4 символов"
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-label text-secondary uppercase tracking-wider">
                  Подтвердите пароль
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>

              {passwordError && (
                <div className="bg-status-error/10 border border-status-error/30 text-status-error text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                  <Icon name="error" className="text-sm shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-status-success/10 border border-status-success/30 text-status-success text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                  <Icon name="check_circle" className="text-sm shrink-0" />
                  <span>Пароль успешно изменён</span>
                </div>
              )}

              <button
                type="submit"
                className="px-6 py-3 bg-primary text-on-primary text-base font-bold rounded-lg hover:opacity-90 active:scale-[0.99] transition-all"
              >
                Изменить пароль
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl border p-4 sm:p-6">
            <h3 className="text-xs font-label text-secondary uppercase tracking-wider mb-4">
              Сессия
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Статус</span>
                <span className="flex items-center gap-1.5 text-status-success font-semibold">
                  <span className="w-1.5 h-1.5 bg-status-success rounded-full" />
                  Активен
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Роль</span>
                <span className="text-text-main font-semibold capitalize">
                  {isAdmin ? "Администратор" : "Студент"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Устройство</span>
                <span className="text-text-main text-xs">Chrome • Windows</span>
              </div>
              <div className="pt-3 border-t border-border-subtle">
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-status-error/10 text-status-error text-sm font-semibold rounded-lg hover:bg-status-error/20 transition-colors">
                  <Icon name="logout" className="text-sm" />
                  Выйти из сессии
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl border p-4 sm:p-6">
            <h3 className="text-xs font-label text-secondary uppercase tracking-wider mb-4">
              Статистика
            </h3>
            {isAdmin ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Всего студентов</span>
                  <span className="font-bold">{dashboardMetrics?.totalStudents ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Проектов</span>
                  <span className="font-bold">{dashboardMetrics?.projects ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Средний балл</span>
                  <span className="font-bold">{formatNumber(dashboardMetrics?.averageGpa)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Посещаемость</span>
                  <span className="font-bold">{dashboardMetrics?.attendance ?? "—"}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Текущий ранг</span>
                  <span className="font-bold text-primary">
                    {currentStudent?.rank ?? ratingStats?.myPlace ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Всего баллов</span>
                  <span className="font-bold">{formatNumber(currentStudent?.totalScore)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Академические</span>
                  <span className="font-bold">{formatNumber(currentStudent?.academicScore)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Активность</span>
                  <span className="font-bold">{formatNumber(currentStudent?.activityScore)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Уровень активности</span>
                  <span
                    className={cn(
                      "font-bold text-xs uppercase tracking-wider",
                      ratingStats?.activityLevel === "Высокая"
                        ? "text-status-success"
                        : ratingStats?.activityLevel === "Низкая"
                          ? "text-status-error"
                          : "text-primary"
                    )}
                  >
                    {ratingStats?.activityLevel ?? "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isAdmin && (
            <div className="glass-card rounded-xl border p-4 sm:p-6">
              <h3 className="text-xs font-label text-secondary uppercase tracking-wider mb-4">
                Мои проекты
              </h3>
              <StudentProjectsPanel />
            </div>
          )}
        </div>
      </section>

      {!isAdmin && ratingStudents.length > 0 && (
        <section className="glass-card rounded-xl border p-4 sm:p-6 animate-fade-up motion-delay-200">
          <h2 className="text-base sm:text-lg font-headline font-bold text-text-main mb-4">
            Успеваемость
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-lg p-4 text-center">
              <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                Средний балл
              </div>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {formatNumber(currentStudent?.academicScore)}
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4 text-center">
              <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                Активность
              </div>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {formatNumber(currentStudent?.activityScore)}
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4 text-center">
              <div className="text-xs text-secondary uppercase font-label tracking-wider mb-1">
                Общий рейтинг
              </div>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                {formatNumber(currentStudent?.totalScore)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
