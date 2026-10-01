import { useId, useRef, useState } from 'react';
import { cn } from '@/utils/helpers';
import { FieldLabel } from './FieldLabel';
import { FixedPopover, useExclusivePicker } from './FixedPopover';

function ClockIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function parseTimeDisplay(value) {
  const raw = String(value || '')
    .trim()
    .split(/\s*[–-]\s*/)[0]
    .trim();
  if (!raw) return { hour: 10, minute: 0, period: 'AM' };
  const ampm = raw.match(/\b(am|pm)\b/i);
  const nums = raw.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (!nums) return { hour: 10, minute: 0, period: 'AM' };
  let hour = Number(nums[1]);
  const minute = Math.min(59, Math.max(0, Number(nums[2])));
  let period = ampm ? ampm[1].toUpperCase() : hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) {
    hour = 12;
    period = ampm ? period : 'AM';
  } else if (hour > 12) {
    hour -= 12;
    period = 'PM';
  } else if (hour === 12 && !ampm) {
    period = 'PM';
  }
  return { hour, minute, period };
}

function formatTimeDisplay({ hour, minute, period }) {
  const h = hour === 0 ? 12 : hour;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

function snapMinute(minute) {
  const snapped = Math.round(Number(minute) / 5) * 5;
  return ((snapped % 60) + 60) % 60;
}

function clockPoint(index, count, radius, cx = 120, cy = 120) {
  const angle = ((index / count) * 360 - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function AnalogClock({ hour, minute, mode, onPickHour, onPickMinute }) {
  const svgRef = useRef(null);
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const minuteMark = snapMinute(minute);
  const markIndex = mode === 'hour' ? hour % 12 : minuteMark / 5;
  const hand = clockPoint(markIndex, 12, mode === 'hour' ? 62 : 70);
  const labels =
    mode === 'hour'
      ? Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
      : Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const pickFromEvent = (e, commit = false) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    const deg = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
    if (mode === 'hour') {
      const h = Math.round(deg / 30) % 12;
      onPickHour(h === 0 ? 12 : h, commit);
    } else {
      const mark = Math.round(deg / 30) % 12;
      onPickMinute(mark * 5, commit);
    }
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 240 240"
      className="w-[220px] h-[220px] mx-auto select-none touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pickFromEvent(e, false);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        pickFromEvent(e, false);
      }}
      onPointerUp={(e) => pickFromEvent(e, true)}
    >
      <defs>
        <radialGradient id={`${gid}-face`} cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
          <stop offset="100%" stopColor="rgba(6,8,15,0.55)" />
        </radialGradient>
      </defs>
      <circle
        cx="120"
        cy="120"
        r="110"
        fill={`url(#${gid}-face)`}
        stroke="rgba(0,212,255,0.22)"
        strokeWidth="1.5"
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const outer = clockPoint(i, 12, 98);
        const inner = clockPoint(i, 12, 92);
        return (
          <line
            key={i}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={i % 3 === 0 ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}
      <line
        x1="120"
        y1="120"
        x2={hand.x}
        y2={hand.y}
        stroke="#00D4FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {labels.map((label, i) => {
        const p = clockPoint(i, 12, 78);
        const active = i === markIndex;
        return (
          <g key={`${mode}-${i}`} style={{ pointerEvents: 'none' }}>
            {active ? (
              <circle cx={p.x} cy={p.y} r="16" fill="#00D4FF" />
            ) : null}
            <text
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              fontSize="13"
              fontFamily="Outfit, system-ui, sans-serif"
              fontWeight={active ? 600 : 500}
              fill={active ? '#06080f' : 'rgba(240,242,255,0.72)'}
            >
              {label}
            </text>
          </g>
        );
      })}
      <circle cx="120" cy="120" r="5" fill="#00D4FF" />
    </svg>
  );
}

export function TimePickerField({
  label,
  value = '',
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder = 'e.g. 10:00 AM',
}) {
  const rootRef = useRef(null);
  const [open, setOpen, requestOpen] = useExclusivePicker();
  const [mode, setMode] = useState('hour');
  const [draft, setDraft] = useState(() => parseTimeDisplay(value));

  const apply = (next = draft) => {
    onChange?.(formatTimeDisplay(next));
  };

  const openPicker = () => {
    if (disabled) return;
    const parsed = parseTimeDisplay(value);
    setDraft({ ...parsed, minute: snapMinute(parsed.minute) });
    setMode('hour');
    requestOpen();
  };

  const pickHour = (hour, done) => {
    setDraft((d) => ({ ...d, hour }));
    if (done) setMode('minute');
  };

  const pickMinute = (minute, done) => {
    const next = { ...draft, minute: snapMinute(minute) };
    setDraft(next);
    if (!done) return;
    onChange?.(formatTimeDisplay(next));
    setOpen(false);
  };

  const setPeriod = (period) => {
    const next = { ...draft, period };
    setDraft(next);
    if (value) onChange?.(formatTimeDisplay(next));
  };

  return (
    <div className="w-full">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div ref={rootRef} className="relative overflow-hidden rounded-lg">
        <button
          type="button"
          disabled={disabled}
          aria-label="Open clock"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-required={required || undefined}
          onClick={openPicker}
          className={cn(
            'slot-quiet-input w-full rounded-lg py-2 pl-3 pr-11 text-left text-sm outline-none',
            error && 'border-danger',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={value ? 'text-[var(--text)] tabular-nums' : 'text-[var(--text3)]'}>
            {value || placeholder}
          </span>
        </button>
        <span className="pointer-events-none absolute right-0.5 top-0.5 bottom-0.5 flex w-10 items-center justify-center rounded-md text-[var(--cyan)]">
          <ClockIcon />
        </span>
      </div>

      <FixedPopover
        open={open}
        anchorRef={rootRef}
        onClose={() => setOpen(false)}
        width={268}
        estimatedHeight={360}
      >
        <div
          className="px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(0,168,204,0.08))',
            borderBottom: '1px solid rgba(0,212,255,0.16)',
          }}
        >
          <div className="flex items-end justify-between gap-3">
            <p className="text-[28px] leading-none font-medium tracking-tight text-[var(--text)] tabular-nums">
              <button
                type="button"
                className={cn(
                  'transition-colors',
                  mode === 'hour' ? 'text-[var(--cyan)]' : 'text-[var(--text)]/70'
                )}
                onClick={() => setMode('hour')}
              >
                {String(draft.hour).padStart(2, '0')}
              </button>
              <span className="text-[var(--text)]/50">:</span>
              <button
                type="button"
                className={cn(
                  'transition-colors',
                  mode === 'minute' ? 'text-[var(--cyan)]' : 'text-[var(--text)]/70'
                )}
                onClick={() => setMode('minute')}
              >
                {String(draft.minute).padStart(2, '0')}
              </button>
            </p>
            <div className="flex flex-col overflow-hidden rounded-md border border-[rgba(0,212,255,0.28)]">
              {['AM', 'PM'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className="px-2.5 py-[3px] text-[11px] font-medium leading-none"
                  style={
                    draft.period === p
                      ? {
                          background: 'linear-gradient(135deg, #00D4FF, #00a8cc)',
                          color: '#06080f',
                        }
                      : { color: 'var(--text2)', background: 'transparent' }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-3 pt-3 pb-2">
          <AnalogClock
            hour={draft.hour}
            minute={draft.minute}
            mode={mode}
            onPickHour={pickHour}
            onPickMinute={pickMinute}
          />
          <div className="mt-1 mb-1 flex justify-end">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#06080f]"
              style={{
                background: 'linear-gradient(135deg, #00D4FF, #00a8cc)',
              }}
              onClick={() => {
                apply();
                setOpen(false);
              }}
            >
              Done
            </button>
          </div>
        </div>
      </FixedPopover>

      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
