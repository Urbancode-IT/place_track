import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { scheduleDayBoundsFromInput } from '../utils/date.utils.js';
import { attachStudentMeetingLink } from '../services/jobApplicationSlots.service.js';

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
    await attachStudentMeetingLink({
      studentId,
      company,
      date,
      timeSlot,
      meetingLink: room,
    });
    return success(res, { ok: true }, 'Submitted. Your placement team will review it.');
  } catch (err) {
    console.error('[PublicApply Error]', err);
    next(err);
  }
}

/**
 * List interviews for a date (public). Course is optional — when omitted, returns
 * interviews across all courses so the "view schedule" button shows everything.
 *
 * Pulls from two sources so it matches the real Today's Live Interview Board:
 *  - "Interview": the actual schedule — covers both approved self-submissions and
 *    interviews the placement team added directly.
 *  - "StudentInterviewRequest" (status SUBMITTED only): still-pending self-submissions
 *    that haven't been approved into the real schedule yet.
 * Approved requests are excluded from the second query since they already have a
 * mirrored row in "Interview" (see resultingInterviewId) — including both would double them up.
 */
export async function listInterviews(req, res, next) {
  try {
    const { course, date } = req.query;
    const { start, end } = scheduleDayBoundsFromInput(date);

    const params = [start.toISOString(), end.toISOString()];
    let courseFilter = '';
    if (course) {
      params.push(course);
      courseFilter = `AND s.course = $${params.length}`;
    }

    const r = await query(
      `SELECT i.id, i.company, i.round, i."timeSlot", i.status::text, false as pending,
              s.name as "studentName", s.course as "studentCourse"
       FROM "Interview" i
       JOIN "Student" s ON s.id = i."studentId"
       WHERE i.date >= $1 AND i.date <= $2
         ${courseFilter}

       UNION ALL

       SELECT r.id, r.company, r.round, r."timeSlot", r.status::text, true as pending,
              s.name as "studentName", s.course as "studentCourse"
       FROM "StudentInterviewRequest" r
       JOIN "Student" s ON s.id = r."studentId"
       WHERE r.date >= $1 AND r.date <= $2
         AND r.status = 'SUBMITTED'
         ${courseFilter}

       ORDER BY "timeSlot" ASC`,
      params
    );

    return success(res, r.rows);
  } catch (err) {
    next(err);
  }
}
