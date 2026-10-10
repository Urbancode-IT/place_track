import { describe, it, expect } from 'vitest';
import {
  clampHistoryDates,
  formatDateOnlyLabel,
  historyPresetRange,
  normalizePortalName,
  uniqueCanonicalPortals,
  hydrateInterviewSlots,
  isValidHttpUrl,
  yesterdayLocalISO,
} from './jobApplication';
import { parseDateOnlyLocal, toDateOnlyISO } from './formatDate';

describe('job application frontend helpers', () => {
  it('canonicalizes portal names', () => {
    expect(normalizePortalName('naukri')).toBe('Naukri');
    expect(normalizePortalName('  NAUKRI  ')).toBe('Naukri');
    expect(uniqueCanonicalPortals(['naukri', 'Naukri', 'LinkedIn'])).toEqual(['Naukri', 'LinkedIn']);
  });

  it('includes today in history ranges', () => {
    const now = new Date(2026, 8, 29, 17, 35, 0);
    expect(yesterdayLocalISO(now)).toBe('2026-09-28');
    expect(historyPresetRange('THIS_WEEK', now)).toEqual({
      dateFrom: '2026-09-28',
      dateTo: '2026-10-04',
      closed: false,
    });
    expect(historyPresetRange('THIS_MONTH', now)).toEqual({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      closed: false,
    });
    expect(historyPresetRange('YESTERDAY', now)).toEqual({
      dateFrom: '2026-09-28',
      dateTo: '2026-09-28',
      closed: false,
    });
    expect(clampHistoryDates('2026-09-28', '2026-10-04')).toEqual({
      dateFrom: '2026-09-28',
      dateTo: '2026-10-04',
      closed: false,
    });
    expect(clampHistoryDates('2026-09-29', '2026-09-29')).toEqual({
      dateFrom: '2026-09-29',
      dateTo: '2026-09-29',
      closed: false,
    });
    const monday = new Date(2026, 8, 28, 9, 0, 0);
    expect(historyPresetRange('THIS_WEEK', monday)).toEqual({
      dateFrom: '2026-09-28',
      dateTo: '2026-10-04',
      closed: false,
    });
  });

  it('formats DATE-only strings without UTC parseISO shift', () => {
    expect(formatDateOnlyLabel('2099-07-01', 'yyyy-MM-dd')).toBe('2099-07-01');
    expect(formatDateOnlyLabel('2099-07-01', 'd MMM')).toMatch(/1 Jul/);
    const local = parseDateOnlyLocal('2099-07-01');
    expect(local?.getFullYear()).toBe(2099);
    expect(local?.getMonth()).toBe(6);
    expect(local?.getDate()).toBe(1);
    expect(toDateOnlyISO(new Date(2099, 6, 1, 23, 30, 0))).toBe('2099-07-01');
    expect(parseDateOnlyLocal('2099-02-30')).toBeNull();
  });

  it('does not treat javascript URLs as received meeting links', () => {
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    const slots = hydrateInterviewSlots({
      interviewsScheduled: 1,
      interviewSlots: [
        {
          companyName: 'Acme',
          date: '2099-07-01',
          timeSlot: '10:00 AM',
          meetingLink: 'javascript:alert(1)',
        },
      ],
    });
    expect(slots[0].meetingLink).toBeNull();
    expect(slots[0].linkStatus).toBe('pending');
  });
});
