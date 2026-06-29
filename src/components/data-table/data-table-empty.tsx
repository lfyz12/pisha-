import { Inbox } from "lucide-react";

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
      <Inbox className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
