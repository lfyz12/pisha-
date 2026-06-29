import { useNavigate } from "react-router";
import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/stores";

export function Header() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-surface-card border-b border-border-subtle flex justify-between items-center px-6">
      <div className="flex items-center gap-6">
        <h2 className="text-lg font-headline font-bold text-text-main">Система Рейтинга</h2>
        <div className="hidden md:flex bg-surface-container-low rounded-lg px-3.5 py-2 items-center gap-2 border border-border-subtle">
          <Icon name="search" className="text-secondary text-[18px]" />
          <input
            className="bg-transparent border-none outline-none text-sm w-56 placeholder:text-secondary/60"
            placeholder="Поиск данных..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end mr-1">
          <span className="text-sm font-semibold text-text-main">
            {currentUser?.name ?? "Гость"}
          </span>
          <span className="text-xs text-secondary capitalize">
            {currentUser?.role === "admin" ? "Администратор" : "Студент"} • УПИШ УрФУ
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 flex items-center justify-center text-secondary hover:bg-surface-container-low rounded-lg transition-colors relative">
            <Icon name="notifications" className="text-[22px]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center text-secondary hover:bg-surface-container-low rounded-lg transition-colors">
            <Icon name="account_circle" className="text-[22px]" />
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/auth/login");
            }}
            className="w-9 h-9 flex items-center justify-center text-secondary hover:text-status-error hover:bg-surface-container-low rounded-lg transition-colors"
            title="Выйти"
          >
            <Icon name="logout" className="text-[22px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
