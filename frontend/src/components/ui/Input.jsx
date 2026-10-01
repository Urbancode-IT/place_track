import { forwardRef, useCallback, useRef, useState } from 'react';
import { cn } from '@/utils/helpers';
import { FieldLabel } from './FieldLabel';

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

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
        'h-[1.05rem] w-[1.05rem] shrink-0 text-[var(--cyan)]',
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
  { label, error, className, labelClassName, errorClassName, prefix, showTimeIcon, passwordToggle, disabled, required, id, type, ...props },
  ref
) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showPasswordToggle = Boolean(passwordToggle);
  const resolvedType = showPasswordToggle && passwordVisible ? 'text' : type;
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
      id={id}
      ref={interactiveTimePicker ? setTextRef : ref}
      disabled={disabled}
      aria-required={required || undefined}
      type={resolvedType}
      className={cn(
        'w-full py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
        'glass-input placeholder:text-[var(--text2)]',
        adornment || showPasswordToggle ? 'relative z-0 pl-3 pr-11' : 'px-3',
        error && 'border-danger',
        className
      )}
      {...props}
    />
  );

  const fieldWithToggle = showPasswordToggle ? (
    <div className="relative">
      {field}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setPasswordVisible((visible) => !visible)}
        className="absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text2)] transition hover:bg-white/5 hover:text-[var(--text)]"
        aria-label={passwordVisible ? 'Hide password' : 'Show password'}
      >
        <EyeIcon off={passwordVisible} />
      </button>
    </div>
  ) : (
    field
  );

  return (
    <div className="w-full">
      <FieldLabel required={required} className={labelClassName} htmlFor={id}>
        {label}
      </FieldLabel>
      {adornment ? (
        <div className="relative isolate overflow-hidden rounded-lg">
          {fieldWithToggle}
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
                'absolute right-0.5 top-0.5 bottom-0.5 z-10 flex w-10 items-center justify-center rounded-md cursor-pointer overflow-hidden',
                'text-[var(--cyan)] transition-colors hover:bg-[rgba(0,212,255,0.10)]',
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
        fieldWithToggle
      )}
      {error && <p className={cn('mt-1 text-sm text-danger', errorClassName)}>{error}</p>}
    </div>
  );
});
