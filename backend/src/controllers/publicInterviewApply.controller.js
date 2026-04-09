import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Shared form URL — any student posts once; row goes to SUBMITTED queue (no per-student token).
 */
export async function applyOpen(req, res, next) {
  try {
    const { name, studentEmail, studentPhone, company, round, date, timeSlot, hrNumber, room, comments, course } = req.validated;
    
    let studentId = null;
    if (studentEmail) {
      const norm = studentEmail.trim().toLowerCase();
      const s = await query(
        `SELECT id FROM "Student" WHERE email IS NOT NULL AND LOWER(TRIM(email)) = $1 LIMIT 2`,
        [norm]
      );
      if (s.rows.length === 1) studentId = s.rows[0].id;
      else if (s.rows.length > 1) throw new AppError('Multiple profiles use this email. Contact placement team.', 400);
    }

    if (!studentId && studentPhone) {
      const s = await query(
        `SELECT id FROM "Student" WHERE phone IS NOT NULL AND (phone = $1 OR phone = $2) LIMIT 2`,
        [studentPhone.trim(), studentPhone.trim().replace(/\D/g, '')]
      );
      if (s.rows.length === 1) studentId = s.rows[0].id;
      else if (s.rows.length > 1) throw new AppError('Multiple profiles use this phone number. Contact placement team.', 400);
    }

    if (!studentId) {
      if (!name) {
        throw new AppError('Profile not found. Please provide your Full Name to register and continue.', 404);
      }
      
      // Auto-register
      const r = await query(
        `INSERT INTO "Student" (name, email, phone, course, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, now(), now())
         RETURNING id`,
        [name, studentEmail?.trim() || null, studentPhone?.trim() || null, course || 'FSD']
      );
      studentId = r.rows[0].id;
    }

    await query(
      `INSERT INTO "StudentInterviewRequest" (
        token, "studentId", company, round, date, "timeSlot", "hrNumber", room, comments, status, "submittedAt"
      ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED', now())`,
      [studentId, company, round, date, timeSlot, hrNumber || null, room || null, comments || null]
    );
    return success(res, { ok: true }, 'Submitted. Your placement team will review it.');
  } catch (err) {
    console.error('[PublicApply Error]', err);
    next(err);
  }
}

/**
 * List interviews for a specific course and date (public).
 */
export async function listInterviews(req, res, next) {
  try {
    const { course, date } = req.query;
    if (!course || !date) {
      return success(res, [], 'Select course and date to view schedule.');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const r = await query(
      `SELECT r.id, r.company, r.round, r."timeSlot", r.status, s.name as "studentName"
       FROM "StudentInterviewRequest" r
       JOIN "Student" s ON s.id = r."studentId"
       WHERE s.course = $1 
         AND r.date >= $2 AND r.date <= $3
         AND r.status IN ('SUBMITTED', 'APPROVED')
       ORDER BY r."timeSlot" ASC`,
      [course, startOfDay.toISOString(), endOfDay.toISOString()]
    );

    return success(res, r.rows);
  } catch (err) {
    next(err);
  }
}
