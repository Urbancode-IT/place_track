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
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
