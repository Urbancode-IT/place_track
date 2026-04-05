import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export async function create(req, res, next) {
  try {
    const { studentId, interviewId, content } = req.validated;
    const trainerId = req.user.id;

    const s = await query('SELECT id FROM "Student" WHERE id = $1', [studentId]);
    if (!s.rows[0]) throw new AppError('Student not found', 404);

    let interviewIdToSave = interviewId || null;
    if (interviewIdToSave) {
      const chk = await query(
        `SELECT i.id FROM "Interview" i
         WHERE i.id = $1 AND i."studentId" = $2`,
        [interviewIdToSave, studentId]
      );
      if (!chk.rows[0]) throw new AppError('Interview does not belong to this student', 400);

      if (req.user.role !== 'ADMIN') {
        const asg = await query(
          `SELECT 1 FROM "InterviewTrainer" WHERE "interviewId" = $1 AND "trainerId" = $2 LIMIT 1`,
          [interviewIdToSave, trainerId]
        );
        if (!asg.rows[0]) {
          throw new AppError('You can only link a review to interviews you are assigned on.', 403);
        }
      }
    }

    const r = await query(
      `INSERT INTO "TrainerHonestReview" ("trainerId", "studentId", "interviewId", content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [trainerId, studentId, interviewIdToSave, content.trim()]
    );
    return success(res, r.rows[0], 'Honest review saved', 201);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const r = isAdmin
      ? await query(
          `SELECT r.*, s.name as "studentName", u.name as "trainerName"
           FROM "TrainerHonestReview" r
           JOIN "Student" s ON s.id = r."studentId"
           JOIN "User" u ON u.id = r."trainerId"
           ORDER BY r."createdAt" DESC
           LIMIT 200`
        )
      : await query(
          `SELECT r.*, s.name as "studentName", u.name as "trainerName"
           FROM "TrainerHonestReview" r
           JOIN "Student" s ON s.id = r."studentId"
           JOIN "User" u ON u.id = r."trainerId"
           WHERE r."trainerId" = $1
           ORDER BY r."createdAt" DESC
           LIMIT 100`,
          [req.user.id]
        );
    return success(res, r.rows);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}
