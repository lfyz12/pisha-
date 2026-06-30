export interface ScholarshipOffer {
  id: string;
  title: string;
  description: string;
  requiredScore: number;
  amount: number;
  type: "academic" | "enhanced" | "achievement";
}
