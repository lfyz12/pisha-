import type { Notification } from "@/types";

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Новый студент",
    message: "Иван Петров зарегистрирован в группе ИН-22",
    type: "info",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    title: "Рейтинг обновлён",
    message: "Данные рейтинга за март 2026 успешно обработаны",
    type: "success",
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    title: "Низкая посещаемость",
    message: "3 студента имеют посещаемость ниже 60%",
    type: "warning",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    title: "Ошибка импорта",
    message: "Не удалось обработать файл data.xlsx — неверный формат",
    type: "error",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    title: "Системное обновление",
    message: "Плановое обновление сервера запланировано на 03:00",
    type: "info",
    read: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

const mockDelay = 300;

export async function fetchNotifications(): Promise<Notification[]> {
  await new Promise((r) => setTimeout(r, mockDelay));
  return MOCK_NOTIFICATIONS;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, mockDelay));
  const n = MOCK_NOTIFICATIONS.find((n) => n.id === notificationId);
  if (n) n.read = true;
}

export async function markAllAsRead(): Promise<void> {
  await new Promise((r) => setTimeout(r, mockDelay));
  MOCK_NOTIFICATIONS.forEach((n) => {
    n.read = true;
  });
}
