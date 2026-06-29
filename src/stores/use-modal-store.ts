import { create } from "zustand";

interface ModalState {
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  isOpen: (modalId: string) => boolean;
}

export const useModalStore = create<ModalState>((set, get) => ({
  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  isOpen: (modalId) => get().activeModal === modalId,
}));
