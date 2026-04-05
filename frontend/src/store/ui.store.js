import { create } from 'zustand';

export const useUIStore = create((set) => ({
  /** false = full labels, true = icon-only rail */
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  modal: null,
  openModal: (key, data) => set({ modal: { key, data } }),
  closeModal: () => set({ modal: null }),
}));
