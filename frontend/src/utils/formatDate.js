import { format, parseISO } from 'date-fns';

export function formatDate(d, pattern = 'MMM d, yyyy') {
  if (!d) return '';
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, pattern);
}

export function formatDateTime(d) {
  return formatDate(d, 'MMM d, yyyy HH:mm');
}
