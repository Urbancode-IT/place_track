import { create } from 'zustand';

export const useUIStore = create((set) => ({
  /** false = full labels, true = icon-only rail (reference dashboard default) */
  sidebarCollapsed: true,
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  /** off-canvas sidebar drawer, mobile only */
  sidebarMobileOpen: false,
  toggleSidebarMobile: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
  closeSidebarMobile: () => set({ sidebarMobileOpen: false }),
  modal: null,
  openModal: (key, data) => set({ modal: { key, data } }),
  closeModal: () => set({ modal: null }),
}));
