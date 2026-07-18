import { Icon } from "@/components/ui/icon";

interface DataTableEmptyProps {
  title?: string;
  description?: string;
}

export function DataTableEmpty({
  title = "No results",
  description = "No results found. Try adjusting your filters or search terms.",
}: DataTableEmptyProps) {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center rounded-md border">
      <Icon name="inbox" className="text-5xl text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
