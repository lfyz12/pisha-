export function Footer() {
  return (
    <footer className="w-full py-[--spacing-md] mt-[--spacing-xxl] border-t border-border-subtle bg-surface-container-lowest">
      <div className="flex flex-col md:flex-row justify-between items-center px-[--spacing-xl] max-w-[--spacing-container-max] mx-auto">
        <span className="text-[--text-body-sm] font-body-sm text-secondary">
          © 2024 Уральский федеральный университет. УПИШ.
        </span>
        <div className="flex space-x-[--spacing-lg] mt-[--spacing-md] md:mt-0">
          <a
            href="#"
            className="text-[--text-label-md] font-label-md text-secondary hover:text-primary transition-all underline"
          >
            Поддержка
          </a>
          <a
            href="#"
            className="text-[--text-label-md] font-label-md text-secondary hover:text-primary transition-all underline"
          >
            Документация
          </a>
          <a
            href="#"
            className="text-[--text-label-md] font-label-md text-secondary hover:text-primary transition-all underline"
          >
            Политика конфиденциальности
          </a>
        </div>
      </div>
    </footer>
  );
}
