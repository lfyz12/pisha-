export type Anchor = {
  word: string;
  targetId: string;
};

export type Hint = {
  pageKey: string;
  title: string;
  text: string;
  anchors: Anchor[];
};

export type TourStep = {
  targetId: string;
  title: string;
  text: string;
};

export type Tour = {
  key: string;
  label: string;
  steps: TourStep[];
};

export const studentHints: Hint[] = [
  {
    pageKey: "rating",
    title: "Рейтинг студентов",
    text: "Здесь можно фильтровать рейтинг по курсу и группе, а также искать конкретных студентов.",
    anchors: [
      { word: "фильтровать", targetId: "course-filter" },
      { word: "искать", targetId: "student-search" },
    ],
  },
  {
    pageKey: "scholarships",
    title: "Стипендии",
    text: "Доступные стипендии зависят от твоего рейтинга. Следи за прогресс-барами.",
    anchors: [{ word: "прогресс-барами", targetId: "scholarship-list" }],
  },
  {
    pageKey: "analytics",
    title: "Аналитика",
    text: "Здесь смотришь свои баллы, посещаемость и характеристики по семестрам.",
    anchors: [
      { word: "баллы", targetId: "metrics-cards" },
      { word: "посещаемость", targetId: "attendance-chart" },
    ],
  },
  {
    pageKey: "chat",
    title: "ИИ-чат",
    text: "Задавай вопросы про рейтинг, стипендии и правила начисления баллов.",
    anchors: [{ word: "вопросы", targetId: "chat-input" }],
  },
  {
    pageKey: "profile",
    title: "Профиль",
    text: "Проверь контакты и смени пароль при необходимости.",
    anchors: [{ word: "пароль", targetId: "change-password-button" }],
  },
];

export const adminHints: Hint[] = [
  {
    pageKey: "admin",
    title: "Импорт данных",
    text: "Загружай рейтинг и мероприятия через Excel. После загрузки система покажет сводку по импортированным данным.",
    anchors: [
      { word: "Excel", targetId: "excel-uploader" },
      { word: "сводку", targetId: "credential-bundle" },
    ],
  },
];

export const appTourSteps: Record<"student" | "admin", TourStep[]> = {
  student: [
    {
      targetId: "nav-rating",
      title: "Рейтинг",
      text: "Ваше положение в общем рейтинге и фильтры.",
    },
    {
      targetId: "nav-scholarships",
      title: "Стипендии",
      text: "Доступные стипендии на основе рейтинга.",
    },
    {
      targetId: "nav-analytics",
      title: "Аналитика",
      text: "Баллы, посещаемость и характеристики.",
    },
    { targetId: "nav-chat", title: "ИИ-чат", text: "Задавайте вопросы ИИ-ассистенту." },
    { targetId: "nav-profile", title: "Профиль", text: "Контакты и смена пароля." },
  ],
  admin: [
    {
      targetId: "nav-admin-import",
      title: "База студентов",
      text: "Управление данными и импорт из Excel.",
    },
  ],
};

export function getHintsByRole(role: "student" | "admin"): Hint[] {
  return role === "admin" ? adminHints : studentHints;
}
