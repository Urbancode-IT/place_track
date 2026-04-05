import { randomUUID } from 'crypto';
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

export async function createLink(req, res, next) {
  try {
    const { studentId } = req.validated;
    const user = req.user;

    const s = await query('SELECT id FROM "Student" WHERE id = $1', [studentId]);
    if (!s.rows[0]) throw new AppError('Student not found', 404);

    if (user.role === 'TRAINER') {
      await assertTrainerCanAccessStudent(user.id, studentId);
    }

    const token = randomUUID();
    await query(
      `INSERT INTO "HonestReviewLink" (token, "studentId", "createdBy") VALUES ($1, $2, $3)`,
      [token, studentId, user.id]
    );

    return success(res, { token, studentId }, 'Link created', 201);
  } catch (err) {
    if (err.code === '42P01') {
      return next(new AppError('Honest review tables not migrated. Run add_student_honest_review.sql', 503));
    }
    next(err);
  }
}
