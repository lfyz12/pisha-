import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

const typeIcons: Record<Notification["type"], string> = {
  info: "info",
  success: "check_circle",
  warning: "warning",
  error: "error",
};

const typeColors: Record<Notification["type"], string> = {
  info: "text-primary",
  success: "text-status-success",
  warning: "text-amber-500",
  error: "text-status-error",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes}м назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  return `${days}д назад`;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  return (
    <button
      onClick={() => !notification.read && onMarkRead(notification.id)}
      className={cn(
        "w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-surface-container-low",
        !notification.read && "bg-surface-container-low/50"
      )}
    >
      <Icon
        name={typeIcons[notification.type]}
        className={cn("text-[20px] mt-0.5 shrink-0", typeColors[notification.type])}
        fill
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn("text-sm", !notification.read && "font-semibold text-text-main")}>
            {notification.title}
          </span>
          <span className="text-[11px] text-secondary whitespace-nowrap shrink-0">
            {relativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-secondary mt-0.5 line-clamp-2">{notification.message}</p>
      </div>
      {!notification.read && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
    </button>
  );
}
