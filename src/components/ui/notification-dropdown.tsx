import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { NotificationItem } from "./notification-item";
import { useNotificationStore } from "@/stores";

export function NotificationDropdown({ onClose: _onClose }: { onClose?: () => void } = {}) {
  const notifications = useNotificationStore((s) => s.notifications);
  const loading = useNotificationStore((s) => s.loading);
  const fetch = useNotificationStore((s) => s.fetch);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  useEffect(() => {
    if (notifications.length === 0) fetch();
  }, [fetch, notifications.length]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-80 sm:w-96 bg-surface-card border border-border-subtle rounded-xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="text-sm font-headline font-bold text-text-main">Уведомления</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => {
              markAllAsRead();
            }}
            className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            Прочитать все
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="sync" className="text-secondary text-lg animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-secondary">
            <Icon name="notifications_off" className="text-2xl mb-2" />
            <span className="text-sm">Нет уведомлений</span>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={(id) => {
                markAsRead(id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
