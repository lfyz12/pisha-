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
    pageKey: "admin-import",
    title: "Импорт данных",
    text: "Загружай рейтинг и мероприятия через Excel. После загрузки система создаст временные учётные данные.",
    anchors: [
      { word: "Excel", targetId: "excel-uploader" },
      { word: "учётные данные", targetId: "credential-bundle" },
    ],
  },
  {
    pageKey: "admin-policies",
    title: "Политики доступа",
    text: "Настраивай, какие данные видят студенты: имена в рейтинге, профили, посещаемость.",
    anchors: [{ word: "видят студенты", targetId: "policy-toggles" }],
  },
  {
    pageKey: "admin-scoring",
    title: "Начисление баллов",
    text: "Выбери студентов и начисли баллы за научную, спортивную или общественную активность.",
    anchors: [
      { word: "студентов", targetId: "student-table" },
      { word: "начисли", targetId: "scoring-form" },
    ],
  },
  {
    pageKey: "admin-ai-rules",
    title: "ИИ-правила",
    text: "Создавай правила, по которым ИИ-ассистент отвечает на вопросы студентов.",
    anchors: [{ word: "правила", targetId: "ai-rules-list" }],
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
    { targetId: "nav-admin-import", title: "Импорт", text: "Загрузка данных из Excel." },
    { targetId: "nav-admin-policies", title: "Политики", text: "Управление видимостью данных." },
    {
      targetId: "nav-admin-scoring",
      title: "Начисление",
      text: "Начисление баллов за активность.",
    },
    { targetId: "nav-admin-ai-rules", title: "ИИ-правила", text: "Правила для ИИ-ассистента." },
  ],
};

export function getHintsByRole(role: "student" | "admin"): Hint[] {
  return role === "admin" ? adminHints : studentHints;
}
