/**
 * Pipeline labels (Scheduled vs Shortlisted) follow the interview *round*:
 * — Early rounds (L1, Assessment, AI round, Screening, Round 1, etc.) → Scheduled
 * — Round 2+ (L2+, Client, HR, Final, custom "Round 2", …) → Shortlisted
 *
 * Terminal / workflow statuses are left unchanged.
 */

const TERMINAL = new Set([
  'REJECTED',
  'SELECTED',
  'AWAITING_RESPONSE',
  'RESCHEDULED',
  'NO_RESPONSE',
]);

function normalizeRound(round) {
  return String(round ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Rounds that should always show under Scheduled (first-stage). */
export function isEarlyInterviewRound(round) {
  const n = normalizeRound(round);
  if (!n) return true;

  const exactEarly = new Set(['l1', 'assessment', 'ai round', 'screening round']);
  if (exactEarly.has(n)) return true;

  if (/^l\s*1$/.test(n)) return true;

  const ladder = n.match(/^l\s*(\d+)$/);
  if (ladder) return Number(ladder[1]) < 2;

  const roundNum = n.match(/\b(?:round|r)\s*(\d+)\b/);
  if (roundNum) return Number(roundNum[1]) < 2;

  if (n.includes('assessment')) return true;
  if (n.includes('screening')) return true;
  if (n === 'ai' || n.includes('ai round')) return true;

  return false;
}

/**
 * Status used for boards, badges, and pipeline columns for SCHEDULED / SHORTLISTED.
 * Other enum values are returned as-is.
 */
export function getEffectiveInterviewStatus(interview) {
  const s = interview?.status;
  if (!s) return 'SCHEDULED';
  if (TERMINAL.has(s)) return s;
  if (s !== 'SCHEDULED' && s !== 'SHORTLISTED') return s;
  return isEarlyInterviewRound(interview?.round) ? 'SCHEDULED' : 'SHORTLISTED';
}
