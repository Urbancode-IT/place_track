/** Canonical portal labels — keep in sync with frontend JOB_APPLICATION_PORTALS. */
const CANONICAL_PORTALS = [
  'Naukri',
  'Monster India',
  'LinkedIn',
  'Shine',
  'TimesJobs',
  'Indeed',
  'Glassdoor',
  'loop CV',
  'Instahyre',
  'foundit',
  'Cutshort',
  'wellfound',
  'freshersworld',
  'hirist.tech',
];

/**
 * Collapse spelling variants so "Naukri" and "naukri" hit the same unique key.
 * Known portals map to the canonical label; unknown names keep trimmed input,
 * title-cased when the user typed all-lower or all-upper.
 */
export function normalizePortalName(raw) {
  const trimmed = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const known = CANONICAL_PORTALS.find((p) => p.toLowerCase() === trimmed.toLowerCase());
  if (known) return known;
  if (trimmed === trimmed.toLowerCase() || trimmed === trimmed.toUpperCase()) {
    return trimmed.replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return trimmed;
}

export function isValidHttpUrl(value) {
  if (value == null) return false;
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Trim, and prepend https:// when the value looks like a host without a scheme. */
export function normalizeMeetingLink(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

export function normalizeCompanyKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Compare interview times by start ("10:00 AM – 11:00 AM" → "10:00 am"). */
export function normalizeTimeSlot(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!value) return '';
  return value.split(/\s*[–-]\s*/)[0].trim();
}

/** True calendar YYYY-MM-DD (rejects 2026-13-40 / Feb 30). */
export function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [y, m, d] = String(value).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Calendar date for DATE columns.
 * node-pg returns DATE as local midnight; UTC getters shift the day in IST (UTC+5:30).
 */
export function formatDateOnly(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return formatDateOnly(parsed);
    const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : trimmed;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value);
}

export function parseInterviewSlots(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function slotHasMeetingLink(slot) {
  return Boolean(safeMeetingLink(slot?.meetingLink));
}

export function safeMeetingLink(raw) {
  const normalized = normalizeMeetingLink(raw);
  if (!normalized || !isValidHttpUrl(normalized)) return null;
  return normalized;
}

/** Escape %, _, and \ so user search is literal, not a LIKE pattern. */
export function likeContainsPattern(raw) {
  const escaped = String(raw || '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  return `%${escaped}%`;
}

export function hydrateInterviewSlots(slots = []) {
  return parseInterviewSlots(slots).map((slot) => {
    const meetingLink = safeMeetingLink(slot.meetingLink);
    return {
      id: slot.id || null,
      companyName: String(slot.companyName || '').trim(),
      date: formatDateOnly(slot.date) || '',
      timeSlot: String(slot.timeSlot || '').trim(),
      meetingLink,
      interviewId: slot.interviewId || null,
      linkStatus: meetingLink ? 'received' : 'pending',
    };
  });
}

export function findDuplicateSlotTime(slots = []) {
  const seen = new Map();
  for (let i = 0; i < slots.length; i += 1) {
    const date = formatDateOnly(slots[i]?.date) || '';
    const time = normalizeTimeSlot(slots[i]?.timeSlot);
    if (!date || !time) continue;
    const key = `${date}|${time}`;
    if (seen.has(key)) return { index: i, otherIndex: seen.get(key) };
    seen.set(key, i);
  }
  return null;
}

export function findMatchingSlotIndex(slots, { company, date, timeSlot }) {
  const hydrated = hydrateInterviewSlots(slots);
  const companyKey = normalizeCompanyKey(company);
  const dateKey = formatDateOnly(date);
  const timeKey = normalizeTimeSlot(timeSlot);
  if (!companyKey) return -1;

  const pending = hydrated
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slotHasMeetingLink(slot));

  const exact = pending.find(
    ({ slot }) =>
      normalizeCompanyKey(slot.companyName) === companyKey &&
      slot.date === dateKey &&
      normalizeTimeSlot(slot.timeSlot) === timeKey
  );
  if (exact) return exact.index;

  const sameCompanyDate = pending.filter(
    ({ slot }) =>
      normalizeCompanyKey(slot.companyName) === companyKey && slot.date === dateKey
  );
  if (sameCompanyDate.length === 1) return sameCompanyDate[0].index;

  return -1;
}
