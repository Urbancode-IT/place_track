import { query } from '../config/db.js';

/**
 * Resolves the interview row for finish form: tries exact company, then no-spaces match, then substring.
 */
export async function resolveInterviewForFinish(studentId, companyInput) {
  const raw = (companyInput || '').trim();
  if (!raw) return null;

  const q1 = await query(
    `SELECT i.* FROM "Interview" i
     WHERE i."studentId" = $1 AND LOWER(TRIM(i.company)) = LOWER(TRIM($2))
     ORDER BY i.date DESC NULLS LAST, i."createdAt" DESC
     LIMIT 1`,
    [studentId, raw]
  );
  if (q1.rows[0]) return q1.rows[0];

  const q2 = await query(
    `SELECT i.* FROM "Interview" i
     WHERE i."studentId" = $1
       AND REPLACE(LOWER(TRIM(i.company)), ' ', '') = REPLACE(LOWER(TRIM($2)), ' ', '')
     ORDER BY i.date DESC NULLS LAST, i."createdAt" DESC
     LIMIT 1`,
    [studentId, raw]
  );
  if (q2.rows[0]) return q2.rows[0];

  const safe = raw.replace(/%/g, '').replace(/_/g, '');
  if (safe.length < 2) return null;
  const q3 = await query(
    `SELECT i.* FROM "Interview" i
     WHERE i."studentId" = $1 AND LOWER(TRIM(i.company)) LIKE LOWER($2)
     ORDER BY LENGTH(i.company) ASC, i.date DESC NULLS LAST, i."createdAt" DESC
     LIMIT 1`,
    [studentId, `%${safe}%`]
  );
  return q3.rows[0] || null;
}

export async function getTrainersForInterview(interviewId) {
  const r = await query(
    `SELECT u.id, u.name, u.email FROM "InterviewTrainer" it
     JOIN "User" u ON u.id = it."trainerId"
     WHERE it."interviewId" = $1
     ORDER BY u.name`,
    [interviewId]
  );
  return r.rows;
}
