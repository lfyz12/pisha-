import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "@/components/ui/icon";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useAuthStore } from "@/stores";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="w-full h-14 sm:h-16 sticky top-0 z-30 glass border-b flex justify-between items-center px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 flex items-center justify-center text-secondary hover:bg-surface-container-low rounded-lg transition-colors shrink-0"
            aria-label="Открыть меню"
          >
            <Icon name="menu" className="text-[22px]" />
          </button>

          <h2 className="text-sm sm:text-base lg:text-lg font-headline font-bold text-text-main truncate">
            Система Рейтинга
          </h2>

          <div className="hidden sm:flex bg-surface-container-low rounded-lg px-3.5 py-1.5 items-center gap-2 border border-border-subtle">
            <Icon name="search" className="text-secondary text-[18px]" />
            <input
              className="bg-transparent border-none outline-none text-sm w-32 md:w-48 lg:w-56 placeholder:text-secondary/60"
              placeholder="Поиск данных..."
              type="text"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden w-9 h-9 flex items-center justify-center text-secondary hover:bg-surface-container-low rounded-lg transition-colors"
            aria-label="Поиск"
          >
            <Icon name={searchOpen ? "close" : "search"} className="text-[22px]" />
          </button>

          <Link
            to="/dashboard/profile"
            className="hidden sm:flex flex-col items-end mr-1 hover:opacity-80 transition-opacity min-w-0"
          >
            <span className="text-xs sm:text-sm font-semibold text-text-main truncate max-w-[120px]">
              {currentUser?.name ?? "Гость"}
            </span>
            <span className="text-[10px] sm:text-xs text-secondary capitalize">
              {currentUser?.role === "admin" ? "Администратор" : "Студент"}
            </span>
          </Link>

          <div className="flex items-center gap-0 sm:gap-1">
            <NotificationBell />
            <Link
              to="/dashboard/profile"
              className="w-9 h-9 flex items-center justify-center text-secondary hover:bg-surface-container-low rounded-lg transition-colors"
            >
              <Icon name="account_circle" className="text-[22px]" />
            </Link>
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

      {searchOpen && (
        <div className="sm:hidden bg-surface-card border-b border-border-subtle px-3 py-2">
          <div className="flex bg-surface-container-low rounded-lg px-3.5 py-2 items-center gap-2 border border-border-subtle">
            <Icon name="search" className="text-secondary text-[18px]" />
            <input
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-secondary/60"
              placeholder="Поиск данных..."
              type="text"
              autoFocus
            />
          </div>
        </div>
      )}
    </>
  );
}
