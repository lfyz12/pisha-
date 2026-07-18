import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIRules, useCreateAIRule } from "@/hooks";
import type { AIRule } from "@/types";

export function AILogicBuilderSection() {
  const { data, isLoading, error } = useAIRules();
  const createAIRule = useCreateAIRule();
  const rules: AIRule[] = data?.data ?? [];

  return (
    <div className="glass-card p-xl rounded-lg border shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8">
        <Icon name="psychology" className="text-[120px] text-primary" />
      </div>
      <h3 className="text-[--text-headline-sm] font-headline-sm mb-xl">Конструктор правил ИИ</h3>

      {isLoading ? (
        <div className="space-y-md relative z-10">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
      ) : error ? (
        <div className="text-status-error text-sm relative z-10">Ошибка загрузки правил</div>
      ) : rules.length === 0 ? (
        <div className="space-y-md relative z-10">
          <div className="flex flex-wrap items-center gap-sm bg-surface-container-low p-md rounded-md border border-border-subtle">
            <span className="text-[--text-label-lg] font-bold text-secondary">ЕСЛИ</span>
            <div className="bg-surface-card border border-border-subtle px-sm py-xs rounded text-[--text-body-sm] font-medium">
              Баллы &gt; 4.5
            </div>
            <span className="text-[--text-label-lg] font-bold text-secondary">И</span>
            <div className="bg-surface-card border border-border-subtle px-sm py-xs rounded text-[--text-body-sm] font-medium">
              Посещаемость &gt; 95%
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-sm bg-primary-fixed/30 p-md rounded-md border border-primary/20">
            <span className="text-[--text-label-lg] font-bold text-primary">ТОГДА</span>
            <div className="bg-primary text-on-primary px-sm py-xs rounded text-[--text-body-sm] font-medium">
              Присвоить статус: "ТОП-Резерв"
            </div>
            <div className="bg-primary text-on-primary px-sm py-xs rounded text-[--text-body-sm] font-medium">
              Уведомить деканат
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-md relative z-10">
          {rules.map((rule) => (
            <div key={rule.id} className="space-y-sm">
              <div className="flex flex-wrap items-center gap-sm bg-surface-container-low p-md rounded-md border border-border-subtle">
                <span className="text-[--text-label-lg] font-bold text-secondary">ЕСЛИ</span>
                {rule.conditions.map((cond, i) => (
                  <div
                    key={i}
                    className="bg-surface-card border border-border-subtle px-sm py-xs rounded text-[--text-body-sm] font-medium"
                  >
                    {cond}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-sm bg-primary-fixed/30 p-md rounded-md border border-primary/20">
                <span className="text-[--text-label-lg] font-bold text-primary">ТОГДА</span>
                {rule.actions.map((action, i) => (
                  <div
                    key={i}
                    className="bg-primary text-on-primary px-sm py-xs rounded text-[--text-body-sm] font-medium"
                  >
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-md relative z-10">
        <button
          className="flex items-center space-x-sm text-primary font-bold hover:translate-x-1 transition-transform"
          disabled={createAIRule.isPending}
        >
          <Icon name="add_circle" />
          <span className="text-[--text-label-lg]">
            {createAIRule.isPending ? "Добавление..." : "Добавить новое правило логики"}
          </span>
        </button>
      </div>
    </div>
  );
}
