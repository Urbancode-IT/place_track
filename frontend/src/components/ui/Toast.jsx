import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNotificationStore } from '@/store/notification.store';
import { cn } from '@/utils/helpers';

function ToastItem({ id, message, type = 'info', remove }) {
  useEffect(() => {
    const t = setTimeout(remove, 4000);
    return () => clearTimeout(t);
  }, [id, remove]);
  const styles = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning',
    info: 'bg-info',
  };
  return (
    <div
      role="status"
      className={cn(
        'toast-pop-in min-w-[240px] max-w-sm px-4 py-3 rounded-xl shadow-xl border border-white/15',
        'font-medium text-sm backdrop-blur-sm',
        styles[type] || styles.info
      )}
    >
      <span>{message}</span>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useNotificationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[99999] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem
            id={t.id}
            message={t.message}
            type={t.type}
            remove={() => removeToast(t.id)}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}
