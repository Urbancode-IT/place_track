import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getByToken(req, res, next) {
  try {
    const { token } = req.validated;
    const r = await query(
      `SELECT r.id, r.status, r."submittedAt", s.name as "studentName", s.course
       FROM "StudentInterviewRequest" r
       JOIN "Student" s ON s.id = r."studentId"
       WHERE r.token = $1`,
      [token]
    );
    const row = r.rows[0];
    if (!row) throw new AppError('Invalid or expired link', 404);
    const firstName = (row.studentName || '').split(/\s+/)[0] || 'Student';
    return success(res, {
      studentFirstName: firstName,
      course: row.course,
      status: row.status,
      submittedAt: row.submittedAt,
      canSubmit: row.status === 'ISSUED',
      message:
        row.status === 'SUBMITTED'
          ? 'Your details were submitted and are waiting for approval.'
          : row.status === 'APPROVED'
            ? 'This request was approved and is on the schedule.'
            : row.status === 'REJECTED'
              ? 'This request was not approved. Contact your placement team if needed.'
              : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitByToken(req, res, next) {
  try {
    const { token } = req.validated;
    const { company, round, date, timeSlot, hrNumber, room, comments } = req.validated;
    const r = await query(
      'SELECT id, status FROM "StudentInterviewRequest" WHERE token = $1',
      [token]
    );
    const row = r.rows[0];
    if (!row) throw new AppError('Invalid or expired link', 404);
    if (row.status !== 'ISSUED') {
      throw new AppError('This link was already used or is no longer available', 400);
    }
    await query(
      `UPDATE "StudentInterviewRequest"
       SET company = $1, round = $2, date = $3, "timeSlot" = $4, "hrNumber" = $5, room = $6, comments = $7,
           status = 'SUBMITTED', "submittedAt" = now(), "updatedAt" = now()
       WHERE id = $8`,
      [company, round, date, timeSlot, hrNumber || null, room || null, comments || null, row.id]
    );
    return success(res, { ok: true }, 'Submitted. Your placement team will review it.');
  } catch (err) {
    next(err);
  }
}
