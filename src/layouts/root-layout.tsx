import { Outlet } from "react-router";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
