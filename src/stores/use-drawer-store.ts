import { create } from "zustand";

interface DrawerState {
  activeDrawer: string | null;
  openDrawer: (drawerId: string) => void;
  closeDrawer: () => void;
  isOpen: (drawerId: string) => boolean;
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
  activeDrawer: null,
  openDrawer: (drawerId) => set({ activeDrawer: drawerId }),
  closeDrawer: () => set({ activeDrawer: null }),
  isOpen: (drawerId) => get().activeDrawer === drawerId,
}));
