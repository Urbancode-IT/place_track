import { create } from 'zustand';
import { toast } from '@/components/ui/Toast';

export const useNotificationStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  toasts: [],
  addToast: ({ type = 'info', message } = {}) => {
    if (!message) return;
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else if (type === 'warning') {
      toast(message, { icon: '⚠️' });
    } else {
      toast(message, { icon: 'ℹ️' });
    }
    set((s) => ({
      toasts: [...s.toasts, { id: Date.now(), type, message }],
    }));
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
