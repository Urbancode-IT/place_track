/**
 * Single source of truth for interview round dropdowns (public apply + token fill form).
 * Value stored in DB is `value` (or custom text when value is "Other").
 */
export const INTERVIEW_ROUND_OPTIONS = [
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'Client_Round', label: 'Client_Round' },
  { value: 'HR Discussion', label: 'HR Discussion' },
  { value: 'Final Round', label: 'Final Round' },
  { value: 'Assessment', label: 'Assessment' },
  { value: 'L3', label: 'L3' },
  { value: 'L4', label: 'L4' },
  { value: 'GD', label: 'GD' },
  { value: 'Manager Round', label: 'Manager Round' },
  { value: 'Screening round', label: 'Screening round' },
  { value: 'AI round', label: 'AI round' },
  { value: 'Reschedule', label: 'Reschedule' },
  { value: 'Other', label: 'Other' },
];

/** When user picks "Other", API receives the custom label as `round`. */
export function resolveSubmittedRound(round, customRound) {
  if (round === 'Other') {
    const t = String(customRound || '').trim();
    return t || round;
  }
  return round;
}
