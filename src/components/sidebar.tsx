import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useThemeStore, useAuthStore } from "@/stores";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === "admin";
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const navItems = [
    { icon: "dashboard", label: "Обзор", path: "/dashboard" },
    { icon: "leaderboard", label: "Таблица рейтинга", path: "/dashboard/rating" },
    ...(isAdmin ? [{ icon: "group", label: "База студентов", path: "/dashboard/admin" }] : []),
    { icon: "payments", label: "Мои стипендии", path: "/dashboard/scholarships" },
    { icon: "analytics", label: "Аналитика", path: "/dashboard/analytics" },
    { icon: "smart_toy", label: "ИИ-Помощник", path: "/dashboard/chat" },
  ];

  const isActive = (path: string) => {
    if (path === "#") return false;
    return location.pathname === path;
  };

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  };

  return (
    <aside className="h-screen w-64 flex-col flex sticky top-0 left-0 border-r border-border-subtle bg-surface-card z-50">
      <div className="flex items-center px-5 h-20 border-b border-border-subtle">
        <div className="w-36 shrink-0 flex items-center justify-center">
          <img
            src={isDark ? "/logo.png" : "/logodark.png"}
            alt="logo"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => item.path !== "#" && navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left",
                active
                  ? "bg-primary-fixed text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-text-main"
              )}
            >
              <Icon name={item.icon} fill={active} className="text-[20px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border-subtle space-y-0.5">
        <button
          onClick={cycleTheme}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-primary font-semibold bg-surface-container-low rounded-lg hover:bg-primary-fixed transition-colors"
        >
          <span>Настройки темы</span>
          <div className="flex items-center gap-1.5">
            <Icon
              name={theme === "dark" ? "dark_mode" : theme === "light" ? "light_mode" : "contrast"}
              className="text-[18px]"
            />
            <span className="text-[11px] uppercase font-bold text-secondary">
              {theme === "dark" ? "Тёмная" : theme === "light" ? "Светлая" : "Система"}
            </span>
          </div>
        </button>
        <button
          onClick={() => navigate("/dashboard/profile")}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-secondary hover:text-text-main hover:bg-surface-container-low rounded-lg transition-all text-left"
        >
          <Icon name="account_circle" className="text-[20px]" />
          <span>Профиль</span>
        </button>
      </div>
    </aside>
  );
}
