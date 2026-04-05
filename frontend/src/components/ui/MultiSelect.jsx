import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/helpers';

export function MultiSelect({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  error,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const normalized = useMemo(
    () =>
      options.map((o) => (typeof o === 'object' ? o : ({ value: o, label: String(o) }))),
    [options]
  );

  const selectedSet = useMemo(() => new Set(value || []), [value]);

  const selected = useMemo(
    () => normalized.filter((o) => selectedSet.has(o.value)),
    [normalized, selectedSet]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const toggleValue = (v) => {
    const next = new Set(value || []);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange?.([...next]);
  };

  const removeValue = (v) => {
    const next = (value || []).filter((x) => x !== v);
    onChange?.(next);
  };

  return (
    <div ref={rootRef} className={cn('w-full', className)}>
      {label && <label className="block text-sm font-medium text-[var(--text2)] mb-1">{label}</label>}

      <button
        type="button"
        className={cn(
          'w-full rounded-lg px-3 py-2 text-left outline-none focus:ring-2 focus:ring-primary focus:border-transparent glass-input',
          error && 'border-danger'
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {selected.length ? (
              <div className="flex flex-wrap gap-2">
                {selected.slice(0, 3).map((s) => (
                  <span
                    key={s.value}
                    className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.10)',
                      color: 'var(--text)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate max-w-[140px]">{s.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-[var(--text2)] hover:text-[var(--text)]"
                      aria-label={`Remove ${s.label}`}
                      onClick={() => removeValue(s.value)}
                      onKeyDown={(e) => e.key === 'Enter' && removeValue(s.value)}
                    >
                      ×
                    </span>
                  </span>
                ))}
                {selected.length > 3 && (
                  <span className="text-xs text-[var(--text2)] self-center">
                    +{selected.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-[var(--text2)]">{placeholder}</span>
            )}
          </div>

          <svg
            className={cn('h-4 w-4 text-[var(--text2)] transition-transform', open && 'rotate-180')}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.7a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl border overflow-hidden"
          style={{
            background: 'rgba(10,13,24,0.92)',
            borderColor: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg px-3 py-2 outline-none glass-input placeholder:text-[var(--text3)]"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {filtered.length ? (
              filtered.map((opt) => {
                const checked = selectedSet.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition',
                      checked
                        ? 'text-[var(--text)]'
                        : 'text-[var(--text2)] hover:text-[var(--text)]'
                    )}
                    style={{
                      background: checked ? 'rgba(54,153,255,0.14)' : 'transparent',
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span
                      className="grid h-5 w-5 place-items-center rounded border"
                      style={{
                        borderColor: checked ? 'rgba(54,153,255,0.40)' : 'rgba(255,255,255,0.16)',
                        background: checked ? 'rgba(54,153,255,0.22)' : 'rgba(255,255,255,0.03)',
                      }}
                      aria-hidden="true"
                    >
                      {checked && (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[color:var(--text)]">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.07 7.07a1 1 0 01-1.414 0l-3.535-3.535a1 1 0 111.414-1.414l2.828 2.828 6.364-6.364a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-[var(--text3)]">No results</div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

