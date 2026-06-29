import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useScholarships } from "@/hooks";
import type { Scholarship } from "@/types";

export default function ScholarshipsPage() {
  const { data, isLoading, error } = useScholarships();
  const scholarships: Scholarship[] = data?.data ?? [];

  return (
    <div className="grid grid-cols-12 gap-6">
      <section className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-lg font-headline font-bold text-text-main">Доступные стипендии</h2>
            <p className="text-sm text-secondary">На основе ваших академических достижений и инженерного рейтинга</p>
          </div>
          <span className="px-2 py-1 bg-surface-container-high text-xs rounded font-semibold text-secondary">
            ВСЕГО: {scholarships.length}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface-card rounded-lg border border-border-subtle p-6">
                <div className="flex gap-6">
                  <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2"><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-20" /></div>
                    <div className="flex justify-between items-center pt-3 border-t border-border-subtle">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-status-error text-sm">Ошибка загрузки стипендий</div>
        ) : scholarships.length === 0 ? (
          <div className="text-center py-12 text-secondary text-sm">Нет доступных стипендий</div>
        ) : (
          <div className="space-y-4">
            {scholarships.map((scholarship) => (
              <div
                key={scholarship.id}
                className={`bg-surface-card rounded-lg border border-border-subtle p-6 flex flex-col md:flex-row gap-6 hover-lift ${
                  !scholarship.isAvailable ? "opacity-80" : ""
                }`}
              >
                <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-lg shrink-0">
                  {scholarship.logo ? (
                    <img src={scholarship.logo} alt="" className="w-10 h-10 object-contain" />
                  ) : (
                    <Icon name="precision_manufacturing" className="text-4xl text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-headline font-semibold">{scholarship.title}</h3>
                    <div className={`flex items-center font-bold shrink-0 ml-4 ${
                      scholarship.matchPercent >= 80 ? "text-status-success" :
                      scholarship.matchPercent >= 60 ? "text-primary" : "text-muted"
                    }`}>
                      <Icon name={scholarship.matchPercent >= 80 ? "check_circle" : "trending_up"} className="text-sm mr-1" />
                      <span className="text-xs">{scholarship.matchPercent}% совпадения</span>
                    </div>
                  </div>
                  <p className="text-sm text-secondary mb-4">{scholarship.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {scholarship.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-border-subtle text-xs rounded-full text-secondary uppercase font-bold tracking-tighter"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                    <div className="text-primary font-bold text-lg font-headline">
                      {scholarship.amount.toLocaleString()} {scholarship.currency}{" "}
                      <span className="text-xs font-normal text-secondary">/ {scholarship.period}</span>
                    </div>
                    {scholarship.isAvailable ? (
                      <button className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-button text-sm hover:translate-y-[-4px] hover:shadow-[0_8px_15px_rgba(221,94,39,0.3)] transition-all">
                        Подать заявку
                      </button>
                    ) : (
                      <button className="border border-text-main text-text-main px-5 py-2.5 rounded-lg font-button text-sm hover:bg-surface-container transition-all">
                        Узнать больше
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col h-[600px] bg-surface-card rounded-xl border border-border-subtle overflow-hidden sticky top-24">
        <div className="p-4 bg-inverse-surface text-on-primary-container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-container rounded-full flex items-center justify-center shadow-lg">
              <Icon name="smart_toy" fill className="text-on-primary-container" />
            </div>
            <div>
              <div className="text-sm font-bold">ИИ-Помощник</div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse" />
                <span className="text-[10px] uppercase font-bold text-primary-fixed">Онлайн</span>
              </div>
            </div>
          </div>
          <button className="text-on-primary-container opacity-60 hover:opacity-100">
            <Icon name="more_vert" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto chat-scroll bg-background/30">
          <div className="text-center">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest bg-surface-container px-2 py-0.5 rounded">Сегодня</span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Icon name="smart_toy" className="text-on-primary text-sm" />
            </div>
            <div className="bg-surface-container p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%]">
              <p className="text-sm leading-relaxed text-text-main">
                Привет! Я проанализировал твой рейтинг. Ты проходишь на стипендию Яндекс. Помочь заполнить заявление?
              </p>
              <span className="text-[10px] text-muted block mt-1 text-right">14:05</span>
            </div>
          </div>

          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
              <Icon name="person" className="text-secondary text-sm" />
            </div>
            <div className="bg-primary text-on-primary p-3 rounded-xl rounded-tr-none shadow-sm max-w-[85%]">
              <p className="text-sm leading-relaxed">Да, давай попробуем. Какие документы мне нужны?</p>
              <span className="text-[10px] text-primary-fixed block mt-1 text-right">14:06</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button className="bg-surface-card border border-border-subtle hover:border-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary transition-all">
              Заполнить заявление
            </button>
            <button className="bg-surface-card border border-border-subtle hover:border-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary transition-all">
              Как повысить посещаемость?
            </button>
            <button className="bg-surface-card border border-border-subtle hover:border-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary transition-all">
              Сравнить с Альфа-Шанс
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-border-subtle bg-surface-container-lowest">
          <div className="mb-3 p-3 border-2 border-dashed border-border-subtle rounded-lg text-center hover:border-primary/50 transition-colors cursor-pointer group">
            <Icon name="cloud_upload" className="text-muted group-hover:text-primary transition-colors" />
            <p className="text-xs text-muted font-semibold mt-1 uppercase">Загрузить сертификаты (PDF, PNG)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                className="w-full bg-surface border border-border-subtle rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Задайте вопрос..."
                type="text"
              />
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary">
                <Icon name="attach_file" className="text-lg" />
              </button>
            </div>
            <button className="bg-primary text-on-primary w-10 h-10 flex items-center justify-center rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md">
              <Icon name="send" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
