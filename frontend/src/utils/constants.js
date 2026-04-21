export const STATUS_COLORS = {
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-800' },
  SHORTLISTED: { bg: 'bg-green-100', text: 'text-green-800' },
  SELECTED: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
  AWAITING_RESPONSE: { bg: 'bg-amber-100', text: 'text-amber-800' },
  RESCHEDULED: { bg: 'bg-purple-100', text: 'text-purple-800' },
  NO_RESPONSE: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export const COURSE_COLORS = {
  FSD: 'bg-primary text-white',
  SDET: 'bg-amber-500 text-white',
  BI_DS: 'bg-emerald-500 text-white',
  NETWORKING: 'bg-pink-500 text-white',
  AWS: 'bg-orange-500 text-white',
  JAVA: 'bg-red-500 text-white',
  REACT: 'bg-cyan-500 text-white',
};

/** Value/label pairs for selects (matches backend `Course` enum). */
export const COURSE_SELECT_OPTIONS = [
  { value: 'FSD', label: 'FSD (Full Stack Development)' },
  { value: 'SDET', label: 'SDET (Automation Testing)' },
  { value: 'BI_DS', label: 'BI & Data Science' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'AWS', label: 'AWS / Cloud' },
  { value: 'JAVA', label: 'Java Specialist' },
  { value: 'REACT', label: 'React / Frontend' },
];

export const QA_STATUS = {
  PREPARED: { bg: 'bg-success/20', text: 'text-success' },
  NEEDS_WORK: { bg: 'bg-warning/20', text: 'text-warning' },
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export const INTERVIEW_STATUS_OPTIONS = [
  'SCHEDULED', 'SHORTLISTED', 'SELECTED', 'REJECTED',
  'AWAITING_RESPONSE', 'RESCHEDULED', 'NO_RESPONSE',
];
