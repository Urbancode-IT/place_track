import { format, parseISO } from 'date-fns';

export function formatDate(d, pattern = 'MMM d, yyyy') {
  if (!d) return '';
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, pattern);
}

export function formatDateTime(d) {
  return formatDate(d, 'MMM d, yyyy HH:mm');
}

/** Local calendar date as YYYY-MM-DD — NOT toISOString(), which reports the UTC date
 * and drifts a day off between 00:00-05:29 IST. */
export function todayLocalISO() {
  const n = new Date();
  return toDateOnlyISO(n);
}

/** YYYY-MM-DD as a local Date. parseISO treats DATE-only strings as UTC midnight
 * and shifts the displayed day in timezones west of UTC. */
export function parseDateOnlyLocal(value) {
  if (value == null || value === '') return null;
  const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== y || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export function toDateOnlyISO(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
