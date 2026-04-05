/**
 * Builds the interview start instant from DB `date` (usually UTC midnight for the chosen calendar day)
 * and free-text `timeSlot`. Uses a fixed offset (default India IST +05:30) for wall-clock interpretation.
 */

const DEFAULT_OFFSET = process.env.INTERVIEW_SCHEDULE_OFFSET || '+05:30';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {Date|string|number} dbDate - Interview.date from PostgreSQL
 * @param {string} timeSlot
 * @returns {{ hour: number, minute: number } | null}
 */
export function parseTimeSlotStart(timeSlot) {
  const slot = String(timeSlot || '').trim();
  if (!slot) return null;

  const withAmPm = slot.match(/(\d{1,2}):(\d{2})\s*(am|pm)\b/i);
  if (withAmPm) {
    let h = parseInt(withAmPm[1], 10);
    const min = parseInt(withAmPm[2], 10);
    const ap = withAmPm[3].toLowerCase();
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }

  const h24 = slot.match(/\b(\d{1,2}):(\d{2})\b/);
  if (h24) {
    const h = parseInt(h24[1], 10);
    const min = parseInt(h24[2], 10);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }

  const range = slot.match(/(\d{1,2})\s*-\s*(\d{1,2})\b/);
  if (range) {
    const a = parseInt(range[1], 10);
    const b = parseInt(range[2], 10);
    if (a < 1 || b < 1) return null;
    let h = a;
    // Morning slots like 8-9, 10-11 (second hour also ≤12 and short span)
    if (a >= 8 && b <= 12 && b > a && b - a <= 4) {
      return { hour: a, minute: 0 };
    }
    // Common PM range e.g. 5-8 → 17:00
    if (a <= 11 && b <= 23 && b > a) {
      h = a <= 11 ? a + 12 : a;
      if (a === 12) h = 12;
      return { hour: h, minute: 0 };
    }
    if (a > 12) return { hour: a, minute: 0 };
  }

  const lone = slot.match(/^(\d{1,2})(?!\d|:)/);
  if (lone) {
    const h = parseInt(lone[1], 10);
    if (h >= 13 && h <= 23) return { hour: h, minute: 0 };
    if (h >= 1 && h <= 11) return { hour: h + 12, minute: 0 };
    if (h === 12) return { hour: 12, minute: 0 };
  }

  return null;
}

/**
 * @param {Date|string|number} dbDate
 * @param {string} timeSlot
 * @returns {Date|null}
 */
export function getInterviewStartAt(dbDate, timeSlot) {
  const d = new Date(dbDate);
  if (Number.isNaN(d.getTime())) return null;

  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  const parsed = parseTimeSlotStart(timeSlot);
  if (!parsed) {
    // Fall back: use stored timestamp as start (e.g. full datetime was saved)
    return d;
  }

  const iso = `${y}-${pad2(mo)}-${pad2(day)}T${pad2(parsed.hour)}:${pad2(parsed.minute)}:00${DEFAULT_OFFSET}`;
  const start = new Date(iso);
  return Number.isNaN(start.getTime()) ? null : start;
}
