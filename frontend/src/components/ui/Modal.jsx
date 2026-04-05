import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/helpers';

export function Modal({ open, onClose, title, children, size = 'md', variant = 'light' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-4xl' };
  const isDark = variant === 'dark';

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative w-full rounded-xl shadow-xl',
          sizes[size],
          isDark
            ? 'bg-[var(--tc-panel)] border border-[var(--border)] text-[var(--text)]'
            : 'bg-white'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className={cn(
              'flex items-center justify-between px-6 py-4 border-b',
              isDark ? 'border-[var(--border)]' : 'border-border'
            )}
          >
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className={isDark ? 'text-[var(--text2)] hover:text-[var(--text)]' : 'text-gray-400 hover:text-gray-600'}
            >
              &times;
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
