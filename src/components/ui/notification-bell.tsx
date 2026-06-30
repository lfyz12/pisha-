import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { NotificationDropdown } from "./notification-dropdown";
import { useNotificationStore } from "@/stores";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const fetch = useNotificationStore((s) => s.fetch);
  const notifications = useNotificationStore((s) => s.notifications);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-9 h-9 flex items-center justify-center text-secondary hover:bg-surface-container-low rounded-lg transition-colors relative">
          <Icon name="notifications" className="text-[22px]" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center",
                "bg-primary text-on-primary text-[10px] font-bold rounded-full px-1"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto p-0 border-none bg-transparent shadow-none"
      >
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
}
