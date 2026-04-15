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

// Stable counter for generating unique IDs for label/input pairs
let _timePickerIdCounter = 0;

export const Input = forwardRef(function Input(
  { label, error, className, labelClassName, errorClassName, prefix, showTimeIcon, disabled, ...props },
  ref
) {
  const adornment = prefix ?? (showTimeIcon ? <TimeIcon /> : null);
  const interactiveTimePicker = Boolean(showTimeIcon && !prefix);

  // Stable unique ID so <label htmlFor> links to the hidden time input
  const timePickerId = useRef(`tp-${++_timePickerIdCounter}`).current;

  const textRef = useRef(null);

  const setTextRef = useCallback(
    (el) => {
      textRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );

  const onNativeTimeChange = useCallback(
    (e) => {
      const v = e.target.value;
      if (!v) return;
      
      const formatted = formatNativeTimeToDisplay(v);
      if (!formatted) return;
      
      const el = textRef.current;
      if (!el) return;
      
      const next = mergeTimeSlotText(el.value, formatted);
      setInputValueAndNotify(el, next);
      
      // Delay clearing to allow browser to finish event bubbling
      setTimeout(() => {
        if (e.target) e.target.value = '';
      }, 50);
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
            /*
             * Hidden native time input — placing it inside a <label> means
             * tapping the label on mobile (iOS/Android) directly triggers the
             * native time picker without needing showPicker() or .click(),
             * both of which are blocked in mobile browsers unless called from
             * a direct user-interaction handler on the element itself.
             */
            <label
              htmlFor={timePickerId}
              className={cn(
                'absolute right-0 top-0 bottom-0 z-10 flex w-12 items-center justify-center rounded-r-lg cursor-pointer overflow-hidden',
                'text-[var(--cyan)] transition-colors hover:bg-[rgba(0,212,255,0.12)]',
                'focus-within:ring-2 focus-within:ring-primary/60',
                disabled && 'pointer-events-none opacity-40'
              )}
              aria-label="Open time picker"
              onClick={(e) => {
                // Ensure the hidden input gets triggered on all browsers
                const input = e.currentTarget.querySelector('input');
                if (input && typeof input.showPicker === 'function') {
                  try {
                    input.showPicker();
                  } catch (err) {
                    // Fallback to default label behavior if showPicker fails
                  }
                }
              }}
            >
              <TimeIcon className="pointer-events-none relative z-10" />
              <input
                id={timePickerId}
                type="time"
                step={60}
                tabIndex={-1}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0 m-0 border-none outline-none z-0"
                style={{ fontSize: '16px' }} // Prevent iOS zoom
                onChange={onNativeTimeChange}
              />
            </label>
          )}
          {!interactiveTimePicker && adornment && (
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
