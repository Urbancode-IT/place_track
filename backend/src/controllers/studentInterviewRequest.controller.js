import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  approveStudentInterviewRequest,
  rejectStudentInterviewRequest,
} from '../services/studentInterviewApproval.service.js';

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
    const result = await approveStudentInterviewRequest(id, req.user.id, {
      trainerIds,
      room: roomFromApprove,
    });
    return success(res, result, 'Approved — interview is on the schedule');
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.validated;
    await rejectStudentInterviewRequest(id, req.user.id);
    return success(res, null, 'Request rejected');
  } catch (err) {
    next(err);
  }
}
