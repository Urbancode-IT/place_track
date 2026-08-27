import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

/** True if user is ADMIN or assigned trainer on the interview. */
export async function assertCanAccessInterview(user, interviewId) {
  if (!user) throw new AppError('Unauthorized', 401);
  if (user.role === 'ADMIN') return;
  if (user.role !== 'TRAINER') throw new AppError('Access denied', 403);
  const r = await query(
    'SELECT 1 FROM "InterviewTrainer" WHERE "interviewId" = $1 AND "trainerId" = $2 LIMIT 1',
    [interviewId, user.id]
  );
  if (!r.rows[0]) throw new AppError('Access denied', 403);
}

/** True if user is ADMIN or assigned to any interview for this student. */
export async function assertCanAccessStudent(user, studentId) {
  if (!user) throw new AppError('Unauthorized', 401);
  if (user.role === 'ADMIN') return;
  if (user.role !== 'TRAINER') throw new AppError('Access denied', 403);
  const r = await query(
    `SELECT 1 FROM "Interview" i
     INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id AND it."trainerId" = $2
     WHERE i."studentId" = $1 LIMIT 1`,
    [studentId, user.id]
  );
  if (!r.rows[0]) throw new AppError('Access denied', 403);
}
