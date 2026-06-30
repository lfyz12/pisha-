import { create } from "zustand";
import type { ScholarshipOffer } from "@/types";
import { fetchScholarshipOffers } from "@/services/scholarship-service";

interface ScholarshipState {
  offers: ScholarshipOffer[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export const useScholarshipStore = create<ScholarshipState>((set) => ({
  offers: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const offers = await fetchScholarshipOffers();
      set({ offers, loading: false });
    } catch {
      set({ error: "Ошибка загрузки стипендий", loading: false });
    }
  },
}));
