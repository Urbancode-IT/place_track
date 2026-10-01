import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { cn } from '@/utils/helpers';
import { parseDateOnlyLocal, toDateOnlyISO } from '@/utils/formatDate';
import { FieldLabel } from './FieldLabel';
import { FixedPopover, useExclusivePicker } from './FixedPopover';

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.05rem] w-[1.05rem]"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function toISODate(date) {
  return toDateOnlyISO(date);
}

function parseISODate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return parseDateOnlyLocal(value);
}

function displayDate(value) {
  const d = parseISODate(value);
  return d ? format(d, 'dd-MM-yyyy') : '';
}

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      {dir === 'prev' ? (
        <path
          fillRule="evenodd"
          d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.24a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.24a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function monthDays(cursor) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const list = [];
  let d = start;
  while (d <= end) {
    list.push(d);
    d = addDays(d, 1);
  }
  return list;
}

function CalendarMonth({
  cursor,
  onCursorChange,
  onPick,
  selectedISO = '',
  rangeFrom = '',
  rangeTo = '',
  maxISO = '',
}) {
  const days = useMemo(() => monthDays(cursor), [cursor]);
  const start = rangeFrom && rangeTo ? (rangeFrom < rangeTo ? rangeFrom : rangeTo) : '';
  const end = rangeFrom && rangeTo ? (rangeFrom < rangeTo ? rangeTo : rangeFrom) : '';
  const hasSpan = Boolean(start && end && start !== end);

  return (
    <div className="pt-cal">
      <div className="pt-cal-head">
        <button
          type="button"
          className="pt-cal-nav"
          aria-label="Previous month"
          onClick={() => onCursorChange(addMonths(cursor, -1))}
        >
          <Chevron dir="prev" />
        </button>
        <p className="pt-cal-title">{format(cursor, 'MMMM yyyy')}</p>
        <button
          type="button"
          className="pt-cal-nav"
          aria-label="Next month"
          onClick={() => onCursorChange(addMonths(cursor, 1))}
        >
          <Chevron dir="next" />
        </button>
      </div>

      <div className="pt-cal-week">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="pt-cal-grid">
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, cursor);
          const sel = iso === selectedISO || (hasSpan ? iso === start || iso === end : iso === start);
          const mid = hasSpan && iso > start && iso < end;
          const today = isToday(day);
          const blocked = Boolean(maxISO && iso > maxISO);
          return (
            <button
              key={iso}
              type="button"
              disabled={blocked}
              onClick={() => {
                if (!blocked) onPick(day);
              }}
              className={cn(
                'pt-cal-day',
                (!inMonth || blocked) && 'is-muted',
                inMonth && !sel && !blocked && 'is-in-month',
                mid && 'is-in-range',
                hasSpan && iso === start && 'is-range-start',
                hasSpan && iso === end && 'is-range-end',
                sel && 'is-selected',
                today && !sel && 'is-today',
                blocked && 'cursor-not-allowed'
              )}
            >
              {sel ? <span className="pt-cal-day-mark is-fill" /> : null}
              {today && !sel ? <span className="pt-cal-day-mark is-ring" /> : null}
              <span className="pt-cal-day-n">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePopover({
  open,
  anchorRef,
  onClose,
  from = '',
  to = '',
  onPickRange,
  maxISO = '',
}) {
  const [cursor, setCursor] = useState(() => parseISODate(from) || new Date());
  const [anchor, setAnchor] = useState('');
  const wasOpen = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!open) {
      setAnchor('');
      return;
    }
    if (!justOpened) return;
    setCursor(parseISODate(from) || new Date());
    setAnchor('');
  }, [open, from]);

  const pick = (date) => {
    const iso = toISODate(date);
    if (maxISO && iso > maxISO) return;
    if (!anchor) {
      setAnchor(iso);
      onPickRange?.({ dateFrom: iso, dateTo: iso, done: false });
      return;
    }
    const dateFrom = anchor <= iso ? anchor : iso;
    const dateTo = anchor <= iso ? iso : anchor;
    onPickRange?.({ dateFrom, dateTo, done: true });
    setAnchor('');
  };

  const rangeFrom = anchor || from;
  const rangeTo = anchor ? anchor : to;

  return (
    <FixedPopover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      width={300}
      minWidth={268}
      maxWidth={320}
      estimatedHeight={380}
    >
      <p className="px-4 pt-3 text-[11px] text-[var(--text3)]">
        {anchor ? 'Now pick the end date' : 'Pick a start date, then an end date'}
      </p>
      <CalendarMonth
        cursor={cursor}
        onCursorChange={setCursor}
        onPick={pick}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        maxISO={maxISO}
      />
    </FixedPopover>
  );
}

export function DatePickerField({
  label,
  value = '',
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder = 'Select date',
  variant = 'quiet',
  maxISO = '',
}) {
  const rootRef = useRef(null);
  const [open, setOpen, requestOpen] = useExclusivePicker();
  const selected = parseISODate(value);
  const [cursor, setCursor] = useState(() => selected || new Date());

  const pick = (date) => {
    const iso = toISODate(date);
    if (maxISO && iso > maxISO) return;
    onChange?.(iso);
    setOpen(false);
  };

  const openPicker = () => {
    if (disabled) return;
    setCursor(selected || new Date());
    requestOpen();
  };

  const triggerClass =
    variant === 'field'
      ? 'glass-input w-full rounded-lg py-2 pl-3 pr-11 text-left text-sm outline-none cursor-pointer focus:ring-0'
      : 'slot-quiet-input w-full rounded-lg py-2 pl-3 pr-11 text-left text-sm outline-none cursor-pointer';

  return (
    <div className="w-full">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div ref={rootRef} className="relative overflow-hidden rounded-lg">
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className={cn(
            triggerClass,
            error && 'border-danger',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-required={required || undefined}
          aria-label={selected ? `Date ${displayDate(value)}` : 'Select date'}
        >
          <span className={selected ? 'text-[var(--text)] tabular-nums' : 'text-[var(--text3)]'}>
            {selected ? displayDate(value) : placeholder}
          </span>
        </button>
        <span className="pointer-events-none absolute right-0.5 top-0.5 bottom-0.5 flex w-10 items-center justify-center rounded-md text-[var(--cyan)]">
          <CalendarIcon />
        </span>
      </div>

      <FixedPopover
        open={open}
        anchorRef={rootRef}
        onClose={() => setOpen(false)}
        width={300}
        minWidth={268}
        maxWidth={320}
        estimatedHeight={340}
      >
        <CalendarMonth
          cursor={cursor}
          onCursorChange={setCursor}
          onPick={pick}
          selectedISO={value || ''}
          maxISO={maxISO}
        />
      </FixedPopover>

      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
