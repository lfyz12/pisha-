export function Footer() {
  return (
    <footer className="w-full border-t border-border-subtle bg-surface-card">
      <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-16 px-6 max-w-[var(--spacing-container-max)] mx-auto py-3 sm:py-0 gap-2 sm:gap-0">
        <div className="flex flex-col items-center sm:items-start">
          <p className="text-xs font-medium text-text-main">
            &copy; 2024 Уральский федеральный университет
          </p>
          <p className="text-[11px] text-muted-foreground">Уральская передовая инженерная школа</p>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Поддержка
          </a>
          <a
            href="#"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Документация
          </a>
          <a
            href="#"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Политика конфиденциальности
          </a>
        </div>
      </div>
    </footer>
  );
}
