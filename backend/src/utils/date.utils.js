/**
 * Schedule calendar helpers using INTERVIEW_SCHEDULE_TZ (default Asia/Kolkata).
 */

const TZ = process.env.INTERVIEW_SCHEDULE_TZ || 'Asia/Kolkata';
const OFFSET = process.env.INTERVIEW_SCHEDULE_OFFSET || '+05:30';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Calendar YYYY-MM-DD in schedule TZ for an instant (default now). */
export function calendarDateInScheduleTz(d = new Date()) {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
}

/**
 * Start of calendar day `daysFromToday` in schedule TZ, as a Date instant.
 * @param {number} daysFromToday
 * @param {Date} [now]
 */
export function dayStartInScheduleTz(daysFromToday = 0, now = new Date()) {
  const todayStr = calendarDateInScheduleTz(now);
  const [y, m, d] = todayStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + daysFromToday));
  const yy = target.getUTCFullYear();
  const mm = target.getUTCMonth() + 1;
  const dd = target.getUTCDate();
  return new Date(`${yy}-${pad2(mm)}-${pad2(dd)}T00:00:00${OFFSET}`);
}

export function dayEndInScheduleTz(daysFromToday = 0, now = new Date()) {
  const start = dayStartInScheduleTz(daysFromToday, now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Parse YYYY-MM-DD (or Date) into schedule-TZ day start/end bounds. */
export function scheduleDayBoundsFromInput(dateInput) {
  if (!dateInput) {
    return { start: dayStartInScheduleTz(0), end: dayEndInScheduleTz(0) };
  }
  const s = String(dateInput).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const start = new Date(`${yy}-${pad2(mm)}-${pad2(dd)}T00:00:00${OFFSET}`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return { start: dayStartInScheduleTz(0), end: dayEndInScheduleTz(0) };
  }
  const cal = calendarDateInScheduleTz(d);
  return scheduleDayBoundsFromInput(cal);
}

/** Local process TZ helpers (legacy). Prefer schedule-TZ helpers for interview windows. */
export function startOfDay(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function startOfMonth(d) {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfMonth(d) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date;
}
