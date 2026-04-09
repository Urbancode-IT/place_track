import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Shared form URL — any student posts once; row goes to SUBMITTED queue (no per-student token).
 */
export async function applyOpen(req, res, next) {
  try {
    const { studentEmail, company, round, date, timeSlot, hrNumber, room, comments, course } = req.validated;
    const norm = studentEmail.trim().toLowerCase();
    const dup = await query(
      `SELECT id FROM "Student" WHERE email IS NOT NULL AND LOWER(TRIM(email)) = $1 LIMIT 2`,
      [norm]
    );
    if (dup.rows.length === 0) {
      throw new AppError('No student found with this email. Use the same email your institute saved for you.', 404);
    }
    if (dup.rows.length > 1) {
      throw new AppError('Multiple profiles use this email. Contact your placement team.', 400);
    }
    const studentId = dup.rows[0].id;
    await query(
      `INSERT INTO "StudentInterviewRequest" (
        token, "studentId", company, round, date, "timeSlot", "hrNumber", room, comments, course, status, "submittedAt"
      ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, 'SUBMITTED', now())`,
      [studentId, company, round, date, timeSlot, hrNumber || null, room || null, comments || null, course || null]
    );
    return success(res, { ok: true }, 'Submitted. Your placement team will review it.');
  } catch (err) {
    next(err);
  }
}
