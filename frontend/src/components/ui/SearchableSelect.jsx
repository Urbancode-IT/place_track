import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/helpers';
import { FieldLabel } from './FieldLabel';

/**
 * Single-select dropdown with optional search and a capped, scrollable menu.
 * When searchable, typing happens in the trigger (touch bar); the menu lists options only.
 * Matches glass / cyan–gradient theme used across the app.
 */
export function SearchableSelect({
  label,
  options = [],
  value = '',
  onChange,
  placeholder = 'Select…',
  searchable = false,
  searchPlaceholder = 'Search…',
  disabled = false,
  error,
  required = false,
  className,
  maxMenuHeight = 140,
  /** Allow typing a value that is not in the options list (e.g. custom portal). */
  allowCustom = false,
  /** Fires as the user types in the search field (for async option loading). */
  onQueryChange,
  /** When false, the parent owns the option list and local label filtering is skipped. */
  filterLocal = true,
  /** Show a loading row instead of "No results" while options are fetching. */
  loading = false,
  hint,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const canSearch = searchable || allowCustom;

  const normalized = useMemo(
    () =>
      options.map((o) =>
        typeof o === 'object' ? o : { value: o, label: String(o) }
      ),
    [options]
  );

  const selected = useMemo(() => {
    const found = normalized.find((o) => String(o.value) === String(value));
    if (found) return found;
    if (allowCustom && value) return { value, label: String(value) };
    return null;
  }, [normalized, value, allowCustom]);

  const filtered = useMemo(() => {
    if (!canSearch || !filterLocal) return normalized;
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query, canSearch, filterLocal]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      setQuery('');
      return;
    }
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!justOpened || !canSearch) return;
    setQuery(
      allowCustom && value && !normalized.some((o) => String(o.value) === String(value))
        ? String(value)
        : ''
    );
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, canSearch, allowCustom, value, normalized]);

  const pick = (v) => {
    onChange?.({ target: { value: v } });
    setQuery('');
    setOpen(false);
  };

  const commitCustom = () => {
    if (!allowCustom) return;
    const next = query.trim();
    if (!next) return;
    pick(next);
  };

  const displayValue = (() => {
    if (!canSearch) return selected?.label || '';
    if (open || inputFocused) return query;
    return selected?.label || '';
  })();

  const inputPlaceholder = open || inputFocused
    ? searchPlaceholder
    : selected
      ? selected.label
      : placeholder;

  const triggerStyle = open
    ? {
        borderColor: 'rgba(0, 212, 255, 0.55)',
        boxShadow: '0 0 0 1px rgba(0, 212, 255, 0.25)',
      }
    : undefined;

  const chevron = (
    <svg
      className={cn(
        'h-4 w-4 shrink-0 text-[var(--text2)] transition-transform',
        open && 'rotate-180'
      )}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.7a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <FieldLabel required={required}>{label}</FieldLabel>

      {canSearch ? (
        <div
          className={cn(
            'w-full rounded-lg px-3 py-2 outline-none focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent glass-input flex items-center gap-2',
            error && 'border-danger',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={triggerStyle}
        >
          <input
            ref={searchRef}
            type="text"
            disabled={disabled}
            value={displayValue}
            placeholder={inputPlaceholder}
            autoComplete="off"
            spellCheck={false}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="min-w-0 flex-1 bg-transparent outline-none text-sm text-[var(--text)] placeholder:text-[var(--text3)]"
            onFocus={() => {
              if (disabled) return;
              setInputFocused(true);
              setOpen(true);
            }}
            onBlur={() => setInputFocused(false)}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              onQueryChange?.(next);
              if (!open) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const q = query.trim().toLowerCase();
                const exact = filtered.find((o) => o.label.toLowerCase() === q);
                if (exact) pick(exact.value);
                else if (allowCustom && query.trim()) commitCustom();
                else if (filtered[0]) pick(filtered[0].value);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
              }
            }}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label={open ? 'Close options' : 'Open options'}
            className="shrink-0 p-0.5 rounded hover:text-[var(--text)] text-[var(--text2)]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (disabled) return;
              setOpen((o) => {
                const next = !o;
                if (next) requestAnimationFrame(() => searchRef.current?.focus());
                return next;
              });
            }}
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'w-full rounded-lg px-3 py-2 text-left outline-none focus:ring-2 focus:ring-primary focus:border-transparent glass-input',
            error && 'border-danger',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={triggerStyle}
          onClick={() => !disabled && setOpen((o) => !o)}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm',
                selected ? 'text-[var(--text)]' : 'text-[var(--text2)]'
              )}
            >
              {selected?.label || placeholder}
            </span>
            {chevron}
          </div>
        </button>
      )}

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border overflow-hidden"
          style={{
            background: 'rgba(10,13,24,0.96)',
            borderColor: 'rgba(0, 212, 255, 0.28)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,212,255,0.08)',
          }}
          role="listbox"
        >
          <div
            className="overflow-y-auto overscroll-contain p-1 job-apps-select-scroll"
            style={{ maxHeight: maxMenuHeight }}
          >
            {allowCustom && query.trim() && !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) ? (
              <button
                type="button"
                role="option"
                onClick={commitCustom}
                className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-[var(--cyan)] hover:text-[var(--text)] truncate"
              >
                Use “{query.trim()}”
              </button>
            ) : null}
            {filtered.length ? (
              filtered.map((opt) => {
                const active = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(opt.value)}
                    className={cn(
                      'w-full rounded-lg px-3 py-1.5 text-left text-sm transition truncate',
                      active
                        ? 'text-[var(--text)]'
                        : 'text-[var(--text2)] hover:text-[var(--text)]'
                    )}
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(0,212,255,0.22), rgba(0,168,204,0.14))'
                        : 'transparent',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2.5 text-sm text-[var(--text3)]">
                {loading
                  ? 'Loading…'
                  : allowCustom && query.trim()
                    ? 'Press Enter to use this value'
                    : 'No results'}
              </div>
            )}
          </div>
        </div>
      )}

      {hint && !error ? (
        <p className="mt-1 text-[11px] text-[var(--text3)]">{hint}</p>
      ) : null}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
