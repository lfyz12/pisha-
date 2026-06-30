import type { ScholarshipOffer } from "@/types";

const MOCK_SCHOLARSHIPS: ScholarshipOffer[] = [
  {
    id: "1",
    title: "Академическая стипендия",
    description:
      "Базовая академическая стипендия для студентов с хорошей успеваемостью. Выплачивается ежемесячно при выполнении минимальных требований по рейтингу.",
    requiredScore: 12,
    amount: 3500,
    type: "academic",
  },
  {
    id: "2",
    title: "Повышенная академическая",
    description:
      "Повышенная стипендия для студентов, демонстрирующих отличные результаты в учебной деятельности и имеющих высокий рейтинг.",
    requiredScore: 16,
    amount: 8500,
    type: "enhanced",
  },
  {
    id: "3",
    title: "Стипендия за достижения",
    description:
      "Стипендия за выдающиеся достижения в научной, проектной или общественной деятельности. Требует максимального рейтинга.",
    requiredScore: 20,
    amount: 15000,
    type: "achievement",
  },
];

export async function fetchScholarshipOffers(): Promise<ScholarshipOffer[]> {
  await new Promise((r) => setTimeout(r, 400));
  return MOCK_SCHOLARSHIPS;
}
