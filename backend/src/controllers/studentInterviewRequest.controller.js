import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { createInterviewWithTrainers } from '../services/interviewCreate.service.js';

export async function createLink(req, res, next) {
  try {
    const { studentId } = req.validated;
    const s = await query('SELECT id FROM "Student" WHERE id = $1', [studentId]);
    if (!s.rows[0]) throw new AppError('Student not found', 404);
    const r = await query(
      `INSERT INTO "StudentInterviewRequest" (token, "studentId", "createdByUserId")
       VALUES (gen_random_uuid()::text, $1, $2)
       RETURNING id, token, "createdAt"`,
      [studentId, req.user.id]
    );
    const row = r.rows[0];
    return success(res, { id: row.id, token: row.token, createdAt: row.createdAt }, 'Link created', 201);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const status = req.validated?.status || 'SUBMITTED';
    const r = await query(
      `SELECT r.*, s.name as "studentName", s.email as "studentEmail", s.course
       FROM "StudentInterviewRequest" r
       JOIN "Student" s ON s.id = r."studentId"
       WHERE r.status = $1
       ORDER BY r."submittedAt" DESC NULLS LAST, r."createdAt" DESC`,
      [status]
    );
    return success(res, r.rows);
  } catch (err) {
    next(err);
  }
}

export async function approve(req, res, next) {
  try {
    const { id } = req.validated;
    const { trainerIds = [], room: roomFromApprove } = req.validated;
    const r = await query('SELECT * FROM "StudentInterviewRequest" WHERE id = $1', [id]);
    const row = r.rows[0];
    if (!row) throw new AppError('Request not found', 404);
    if (row.status !== 'SUBMITTED') {
      throw new AppError('Only submitted requests can be approved', 400);
    }
    if (!row.company || !row.round || !row.date || !row.timeSlot) {
      throw new AppError('Request is missing required fields', 400);
    }
    // Schedule calendar date = **when admin approves** so it always appears on Today's Live Interview Board
    // (student's date field is kept as a note — they may pick wrong TZ / wrong day).
    const interviewDate = new Date();
    const submittedDateNote = row.date
      ? `[Student form date: ${new Date(row.date).toISOString().slice(0, 10)}]`
      : '';
    const mergedComments = [row.comments, submittedDateNote].filter(Boolean).join('\n\n') || null;
    const finalRoom =
      roomFromApprove !== undefined && roomFromApprove !== null
        ? String(roomFromApprove).trim() || null
        : (row.room && String(row.room).trim()) || null;
    const { interview, student } = await createInterviewWithTrainers({
      studentId: row.studentId,
      company: row.company,
      round: row.round,
      date: interviewDate,
      timeSlot: row.timeSlot,
      hrNumber: row.hrNumber,
      room: finalRoom,
      comments: mergedComments,
      trainerIds,
      broadcastEmailToAllTrainersIfUnassigned: true,
    });
    await query(
      `UPDATE "StudentInterviewRequest"
       SET status = 'APPROVED', "reviewedAt" = now(), "reviewedByUserId" = $1, "resultingInterviewId" = $2, "updatedAt" = now()
       WHERE id = $3`,
      [req.user.id, interview.id, id]
    );
    return success(res, { interview, student, requestId: id }, 'Approved — interview is on the schedule');
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.validated;
    const r = await query('SELECT * FROM "StudentInterviewRequest" WHERE id = $1', [id]);
    const row = r.rows[0];
    if (!row) throw new AppError('Request not found', 404);
    if (row.status !== 'SUBMITTED') {
      throw new AppError('Only submitted requests can be rejected', 400);
    }
    await query(
      `UPDATE "StudentInterviewRequest"
       SET status = 'REJECTED', "reviewedAt" = now(), "reviewedByUserId" = $1, "updatedAt" = now()
       WHERE id = $2`,
      [req.user.id, id]
    );
    return success(res, null, 'Request rejected');
  } catch (err) {
    next(err);
  }
}
