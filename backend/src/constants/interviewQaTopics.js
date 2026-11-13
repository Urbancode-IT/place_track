/** Keep in sync with frontend/src/constants/interviewQaTopics.js */
export const INTERVIEW_QA_TOPICS_BY_COURSE = {
  FSD: ['Frontend', 'Backend', 'Database', 'DevOps / Cloud', 'System Design', 'DSA', 'HR / Behavioral', 'Other'],
  REACT: ['Frontend', 'React', 'JavaScript', 'CSS / UI', 'API Integration', 'DSA', 'HR / Behavioral', 'Other'],
  JAVA: ['Core Java', 'Spring / Backend', 'Database', 'Microservices', 'DSA', 'HR / Behavioral', 'Other'],
  SDET: ['Selenium / UI Automation', 'API Testing', 'Framework Design', 'Java / Python', 'CI/CD', 'HR / Behavioral', 'Other'],
  BI_DS: ['SQL / Database', 'Python', 'Statistics / ML', 'Visualization / BI tools', 'Case Study', 'HR / Behavioral', 'Other'],
  NETWORKING: ['Networking Fundamentals', 'Routing / Switching', 'Security', 'Cloud Networking', 'Troubleshooting', 'HR / Behavioral', 'Other'],
  AWS: ['AWS Core', 'Compute / Storage', 'Networking', 'DevOps / IaC', 'Security', 'HR / Behavioral', 'Other'],
};

export const INTERVIEW_QA_TOPICS_DEFAULT = [
  'Frontend',
  'Backend',
  'Database',
  'DevOps / Cloud',
  'Testing / QA',
  'DSA / Aptitude',
  'System Design',
  'Domain / Role-specific',
  'HR / Behavioral',
  'Other',
];

export function topicsForCourse(course) {
  const key = String(course || '').trim().toUpperCase();
  if (key && INTERVIEW_QA_TOPICS_BY_COURSE[key]) return INTERVIEW_QA_TOPICS_BY_COURSE[key];
  if (/FSD|FULL\s*STACK/i.test(course || '')) return INTERVIEW_QA_TOPICS_BY_COURSE.FSD;
  if (/SDET|AUTOMATION|TEST/i.test(course || '')) return INTERVIEW_QA_TOPICS_BY_COURSE.SDET;
  if (/BI|DATA|ML|AI/i.test(course || '')) return INTERVIEW_QA_TOPICS_BY_COURSE.BI_DS;
  if (/NETWORK|CCNA/i.test(course || '')) return INTERVIEW_QA_TOPICS_BY_COURSE.NETWORKING;
  if (/AWS|CLOUD|DEVOPS/i.test(course || '')) return INTERVIEW_QA_TOPICS_BY_COURSE.AWS;
  if (/JAVA/i.test(course || '')) return INTERVIEW_QA_TOPICS_BY_COURSE.JAVA;
  if (/REACT|FRONTEND|UI/i.test(course || '')) return INTERVIEW_QA_TOPICS_BY_COURSE.REACT;
  return INTERVIEW_QA_TOPICS_DEFAULT;
}

export function allKnownTopics() {
  const set = new Set(INTERVIEW_QA_TOPICS_DEFAULT);
  for (const list of Object.values(INTERVIEW_QA_TOPICS_BY_COURSE)) {
    for (const t of list) set.add(t);
  }
  return [...set];
}
