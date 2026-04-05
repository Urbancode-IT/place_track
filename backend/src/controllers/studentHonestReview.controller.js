import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

async function assertTrainerCanAccessStudent(trainerId, studentId) {
  const r = await query(
    `SELECT 1 FROM "Interview" i
     INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id AND it."trainerId" = $1
     WHERE i."studentId" = $2 LIMIT 1`,
    [trainerId, studentId]
  );
  if (!r.rows[0]) throw new AppError('Access denied', 403);
}

export async function listByStudent(req, res, next) {
  try {
    const { studentId } = req.validated;
    if (req.user.role === 'TRAINER') {
      await assertTrainerCanAccessStudent(req.user.id, studentId);
    }

    const r = await query(
      `SELECT r.id, r."studentId", r.content, r."createdAt"
       FROM "StudentHonestReview" r
       WHERE r."studentId" = $1
       ORDER BY r."createdAt" DESC
       LIMIT 100`,
      [studentId]
    );
    return success(res, r.rows);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}

/** Admin: all recent. Trainer: only students they share an interview with. */
export async function listRecent(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    if (req.user.role === 'ADMIN') {
      const r = await query(
        `SELECT r.id, r."studentId", r.content, r."createdAt", s.name as "studentName", s.email as "studentEmail"
         FROM "StudentHonestReview" r
         JOIN "Student" s ON s.id = r."studentId"
         ORDER BY r."createdAt" DESC
         LIMIT $1`,
        [limit]
      );
      return success(res, r.rows);
    }
    const r = await query(
      `SELECT r.id, r."studentId", r.content, r."createdAt", s.name as "studentName", s.email as "studentEmail"
       FROM "StudentHonestReview" r
       JOIN "Student" s ON s.id = r."studentId"
       WHERE EXISTS (
         SELECT 1 FROM "Interview" i
         INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id AND it."trainerId" = $2
         WHERE i."studentId" = r."studentId"
       )
       ORDER BY r."createdAt" DESC
       LIMIT $1`,
      [limit, req.user.id]
    );
    return success(res, r.rows);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}
