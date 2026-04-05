import { forwardRef, useCallback, useRef } from 'react';
import { cn } from '@/utils/helpers';

function TimeIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        'h-[1.125rem] w-[1.125rem] shrink-0 text-[var(--cyan)] drop-shadow-[0_0_8px_rgba(0,212,255,0.25)]',
        className
      )}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function formatNativeTimeToDisplay(value) {
  if (!value || typeof value !== 'string') return '';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const d = new Date(2000, 0, 1, h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Build "10:00 AM – 11:00 AM" style text from repeated picker use */
function mergeTimeSlotText(prev, newPart) {
  const trimmed = (prev || '').trim();
  if (!trimmed) return newPart;
  const rangeMatch = trimmed.match(/^(.+?)\s*[–-]\s*(.+)$/);
  if (rangeMatch) {
    return `${rangeMatch[1].trim()} – ${newPart}`;
  }
  return `${trimmed} – ${newPart}`;
}

function setInputValueAndNotify(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export const Input = forwardRef(function Input(
  { label, error, className, labelClassName, errorClassName, prefix, showTimeIcon, disabled, ...props },
  ref
) {
  const adornment = prefix ?? (showTimeIcon ? <TimeIcon /> : null);
  const interactiveTimePicker = Boolean(showTimeIcon && !prefix);

  const textRef = useRef(null);
  const timePickerRef = useRef(null);

  const setTextRef = useCallback(
    (el) => {
      textRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );

  const openNativeTimePicker = useCallback(() => {
    if (disabled) return;
    const el = timePickerRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      /* insecure context or unsupported */
    }
    el.focus();
    el.click();
  }, [disabled]);

  const onNativeTimeChange = useCallback(
    (e) => {
      const v = e.target.value;
      e.target.value = '';
      if (!v) return;
      const formatted = formatNativeTimeToDisplay(v);
      if (!formatted) return;
      const el = textRef.current;
      if (!el) return;
      const next = mergeTimeSlotText(el.value, formatted);
      setInputValueAndNotify(el, next);
    },
    []
  );

  const field = (
    <input
      ref={interactiveTimePicker ? setTextRef : ref}
      disabled={disabled}
      className={cn(
        'w-full py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
        'glass-input placeholder:text-[var(--text2)]',
        adornment ? 'relative z-0 pl-3 pr-11' : 'px-3',
        error && 'border-danger',
        className
      )}
      {...props}
    />
  );

  return (
    <div className="w-full">
      {label && (
        <label className={cn('block text-sm font-medium mb-1', labelClassName || 'text-[var(--text2)]')}>
          {label}
        </label>
      )}
      {adornment ? (
        <div className="relative isolate">
          {field}
          {interactiveTimePicker && (
            <input
              ref={timePickerRef}
              type="time"
              step={60}
              tabIndex={-1}
              className="sr-only"
              aria-hidden
              onChange={onNativeTimeChange}
            />
          )}
          {interactiveTimePicker ? (
            <button
              type="button"
              disabled={disabled}
              className={cn(
                'absolute right-1.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg',
                'text-[var(--cyan)] transition-colors hover:bg-[rgba(0,212,255,0.12)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                disabled && 'pointer-events-none opacity-40'
              )}
              aria-label="Open time picker"
              onClick={(e) => {
                e.preventDefault();
                openNativeTimePicker();
              }}
            >
              <TimeIcon />
            </button>
          ) : (
            <span
              className="pointer-events-none absolute right-3 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center"
              aria-hidden
            >
              {adornment}
            </span>
          )}
        </div>
      ) : (
        field
      )}
      {error && <p className={cn('mt-1 text-sm text-danger', errorClassName)}>{error}</p>}
    </div>
  );
});
