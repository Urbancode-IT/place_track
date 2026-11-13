/**
 * Builds the interview start instant from DB `date` (usually UTC midnight for the chosen calendar day)
 * and free-text `timeSlot`. Uses a fixed offset (default India IST +05:30) for wall-clock interpretation.
 */

const DEFAULT_OFFSET = process.env.INTERVIEW_SCHEDULE_OFFSET || '+05:30';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseClockToken(token) {
  const t = String(token || '').trim();
  if (!t) return null;

  const withAmPm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (withAmPm) {
    let h = parseInt(withAmPm[1], 10);
    const min = parseInt(withAmPm[2] || '0', 10);
    const ap = withAmPm[3].toLowerCase();
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
    return null;
  }

  const h24 = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (h24) {
    const h = parseInt(h24[1], 10);
    const min = parseInt(h24[2] || '0', 10);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }
  return null;
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
    // Ambiguous 1–11 without am/pm: treat as morning (campus default), not forced PM.
    if (h >= 1 && h <= 11) return { hour: h, minute: 0 };
    if (h === 12) return { hour: 12, minute: 0 };
    if (h === 0) return { hour: 0, minute: 0 };
  }

  return null;
}

/**
 * End clock from free-text slot when a range is present (e.g. "10:00 AM - 11:00 AM", "10-11").
 * @returns {{ hour: number, minute: number } | null}
 */
export function parseTimeSlotEnd(timeSlot) {
  const slot = String(timeSlot || '').trim();
  if (!slot) return null;

  const amPmRange = slot.match(
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  );
  if (amPmRange) {
    return parseClockToken(amPmRange[2]);
  }

  const h24Range = slot.match(/(\d{1,2}:\d{2})\s*[-–—to]+\s*(\d{1,2}:\d{2})/i);
  if (h24Range) {
    return parseClockToken(h24Range[2]);
  }

  const hourRange = slot.match(/(\d{1,2})\s*-\s*(\d{1,2})\b/);
  if (hourRange) {
    const a = parseInt(hourRange[1], 10);
    const b = parseInt(hourRange[2], 10);
    if (a < 1 || b < 1) return null;
    if (a >= 8 && b <= 12 && b > a && b - a <= 4) {
      return { hour: b, minute: 0 };
    }
    if (a <= 11 && b <= 23 && b > a) {
      let h = b;
      if (a <= 11 && b <= 11) h = b + 12;
      if (b === 12) h = 12;
      if (b > 12) h = b;
      return { hour: h, minute: 0 };
    }
    if (a > 12 && b > a && b <= 23) return { hour: b, minute: 0 };
  }

  return null;
}

function wallClockOnDate(dbDate, clock) {
  const d = new Date(dbDate);
  if (Number.isNaN(d.getTime()) || !clock) return null;
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const iso = `${y}-${pad2(mo)}-${pad2(day)}T${pad2(clock.hour)}:${pad2(clock.minute)}:00${DEFAULT_OFFSET}`;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

/**
 * @param {Date|string|number} dbDate
 * @param {string} timeSlot
 * @returns {Date|null}
 */
export function getInterviewStartAt(dbDate, timeSlot) {
  const d = new Date(dbDate);
  if (Number.isNaN(d.getTime())) return null;

  const parsed = parseTimeSlotStart(timeSlot);
  if (!parsed) {
    // Fall back: use stored timestamp as start (e.g. full datetime was saved)
    return d;
  }

  return wallClockOnDate(dbDate, parsed);
}

/**
 * Interview end instant: explicit slot end if present, else start + default duration.
 * Mail / finish reminders must use this so nothing fires before the slot is over.
 * @param {Date|string|number} dbDate
 * @param {string} timeSlot
 * @param {{ defaultDurationMin?: number }} [opts]
 * @returns {Date|null}
 */
export function getInterviewEndAt(dbDate, timeSlot, opts = {}) {
  const defaultDurationMin = Math.min(
    240,
    Math.max(15, Number(opts.defaultDurationMin ?? process.env.INTERVIEW_DEFAULT_DURATION_MIN ?? 60))
  );

  const startAt = getInterviewStartAt(dbDate, timeSlot);
  if (!startAt) return null;

  const endClock = parseTimeSlotEnd(timeSlot);
  if (endClock) {
    let endAt = wallClockOnDate(dbDate, endClock);
    if (!endAt) return null;
    // Overnight / PM wrap: end earlier than start → push end to next day
    if (endAt.getTime() <= startAt.getTime()) {
      endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
    }
    // Sanity: if parsed end is before start somehow still, fall back
    if (endAt.getTime() > startAt.getTime()) return endAt;
  }

  return new Date(startAt.getTime() + defaultDurationMin * 60 * 1000);
}
