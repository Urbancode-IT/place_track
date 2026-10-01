import { JOB_APPLICATION_PORTALS } from '@/utils/constants';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { parseDateOnlyLocal, toDateOnlyISO } from '@/utils/formatDate';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

export function normalizePortalName(raw) {
  const trimmed = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const known = JOB_APPLICATION_PORTALS.find(
    (p) => p.toLowerCase() === trimmed.toLowerCase()
  );
  if (known) return known;
  if (trimmed === trimmed.toLowerCase() || trimmed === trimmed.toUpperCase()) {
    return trimmed.replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return trimmed;
}

export function uniqueCanonicalPortals(portals = []) {
  const map = new Map();
  for (const raw of portals) {
    const canonical = normalizePortalName(raw);
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (!map.has(key)) map.set(key, canonical);
  }
  return [...map.values()];
}

/** Local calendar yesterday as YYYY-MM-DD. History starts here; today stays on Daily Entry. */
export function yesterdayLocalISO(now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  day.setDate(day.getDate() - 1);
  return toDateOnlyISO(day);
}

/**
 * History only includes dates before today. A range that is entirely today or later
 * is closed so the caller does not fall back to every past row.
 */
export function clampHistoryDates(dateFrom, dateTo, now = new Date()) {
  const yesterday = yesterdayLocalISO(now);
  const fromIn = isDateOnly(dateFrom) ? dateFrom : '';
  const toIn = isDateOnly(dateTo) ? dateTo : '';
  if (!fromIn && !toIn) return { dateFrom: '', dateTo: '', closed: false };
  const from = fromIn && fromIn > yesterday ? '' : fromIn;
  const to = toIn && toIn > yesterday ? yesterday : toIn;
  if ((fromIn && !from && (!toIn || toIn > yesterday)) || (from && to && from > to)) {
    return { dateFrom: '', dateTo: '', closed: true };
  }
  return { dateFrom: from, dateTo: to, closed: false };
}

/** Preset windows for History. Each window ends on yesterday. */
export function historyPresetRange(presetId, now = new Date()) {
  const yesterday = yesterdayLocalISO(now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (presetId === 'YESTERDAY') {
    return { dateFrom: yesterday, dateTo: yesterday, closed: false };
  }
  if (presetId === 'THIS_WEEK') {
    return clampHistoryDates(
      toDateOnlyISO(startOfWeek(today, { weekStartsOn: 1 })),
      toDateOnlyISO(endOfWeek(today, { weekStartsOn: 1 })),
      now
    );
  }
  if (presetId === 'THIS_MONTH') {
    return clampHistoryDates(
      toDateOnlyISO(startOfMonth(today)),
      toDateOnlyISO(endOfMonth(today)),
      now
    );
  }
  return { dateFrom: '', dateTo: '', closed: false };
}

/** Format a DATE-only YYYY-MM-DD without UTC parseISO shifting the calendar day. */
export function formatDateOnlyLabel(value, pattern = 'd MMM') {
  if (!value) return '';
  const d = parseDateOnlyLocal(value);
  if (!d) return String(value);
  return format(d, pattern);
}

/** Hard caps for a single daily entry. */
export const APPLICATION_COUNT_MAX = 50;
export const CALLS_RECEIVED_MAX = 20;
export const INTERVIEWS_SCHEDULED_MAX = 10;

export function isValidHttpUrl(value) {
  if (value == null || value === '') return false;
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeMeetingLink(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

export function createEmptyInterviewSlot(date = '') {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    companyName: '',
    date: date || '',
    timeSlot: '',
  };
}

export function syncInterviewSlots(slots = [], count, defaultDate = '') {
  const n = Math.max(0, Number(count) || 0);
  const current = Array.isArray(slots) ? slots : [];
  if (n <= 0) return [];
  if (current.length === n) return current;
  if (current.length < n) {
    const extra = Array.from({ length: n - current.length }, () =>
      createEmptyInterviewSlot(current[0]?.date || defaultDate)
    );
    return [...current, ...extra];
  }
  return current.slice(0, n);
}

export function hydrateInterviewSlots(row) {
  const raw = row?.interviewSlots;
  if (Array.isArray(raw) && raw.length) {
    return raw.map((slot) => {
      const meetingLink = isValidHttpUrl(normalizeMeetingLink(slot.meetingLink))
        ? normalizeMeetingLink(slot.meetingLink)
        : null;
      return {
        id: slot.id || null,
        companyName: String(slot.companyName || '').trim(),
        date: slot.date || row?.date || '',
        timeSlot: String(slot.timeSlot || '').trim(),
        meetingLink,
        interviewId: slot.interviewId || null,
        linkStatus: meetingLink ? 'received' : 'pending',
      };
    });
  }
  if ((row?.interviewsScheduled || 0) > 0 && (row?.companyName || row?.interviewLink)) {
    const meetingLink = isValidHttpUrl(normalizeMeetingLink(row.interviewLink))
      ? normalizeMeetingLink(row.interviewLink)
      : null;
    return [
      {
        id: row.id,
        companyName: row.companyName || '',
        date: row.date || '',
        timeSlot: '',
        meetingLink,
        interviewId: row.interviewId || null,
        linkStatus: meetingLink ? 'received' : 'pending',
      },
    ];
  }
  return [];
}
