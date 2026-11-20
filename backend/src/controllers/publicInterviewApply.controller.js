import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  calendarDateInScheduleTz,
  scheduleDayBoundsFromInput,
  scheduleRangeBoundsFromInput,
} from '../utils/date.utils.js';
import { normalizeTimeSlot } from '../utils/jobApplication.utils.js';
import { attachStudentMeetingLink } from '../services/jobApplicationSlots.service.js';
import { notifyGoogleChatSelfSubmitPendingApproval } from '../services/googleChatInterviewNotify.service.js';

/** Reject when another interview/pending request already uses the same day + start time. */
async function assertNoTimeSlotConflict({ date, timeSlot }) {
  const timeKey = normalizeTimeSlot(timeSlot);
  if (!timeKey) return;

  const { start, end } = scheduleDayBoundsFromInput(date);
  const r = await query(
    `SELECT x."timeSlot" FROM (
       SELECT i."timeSlot" FROM "Interview" i
       WHERE i.date >= $1 AND i.date <= $2
       UNION ALL
       SELECT r."timeSlot" FROM "StudentInterviewRequest" r
       WHERE r.date >= $1 AND r.date <= $2
         AND r.status = 'SUBMITTED'
     ) x`,
    [start.toISOString(), end.toISOString()]
  );

  const clash = r.rows.find((row) => normalizeTimeSlot(row.timeSlot) === timeKey);
  if (clash) {
    throw new AppError(
      `Time slot "${timeSlot}" is already taken on this date. Choose a different time to avoid conflicts.`,
      409
    );
  }
}

/**
 * Shared form URL — any student posts once; row goes to SUBMITTED queue (no per-student token).
 */
export async function applyOpen(req, res, next) {
  try {
    const { name, studentEmail, studentPhone, company, round, date, timeSlot, hrNumber, room, comments, course } = req.validated;

    await assertNoTimeSlotConflict({ date, timeSlot });

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

    const inserted = await query(
      `INSERT INTO "StudentInterviewRequest" (
        token, "studentId", company, round, date, "timeSlot", "hrNumber", room, comments, status, "submittedAt"
      ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED', now())
       RETURNING id`,
      [studentId, company, round, date, timeSlot, hrNumber || null, room || null, comments || null]
    );
    await attachStudentMeetingLink({
      studentId,
      company,
      date,
      timeSlot,
      meetingLink: room,
    });
    const requestId = inserted.rows[0]?.id;
    if (requestId) {
      notifyGoogleChatSelfSubmitPendingApproval(requestId).catch((e) =>
        console.error('[google-chat] self-submit pending:', e)
      );
    }
    return success(res, { ok: true }, 'Submitted. Your placement team will review it.');
  } catch (err) {
    console.error('[PublicApply Error]', err);
    next(err);
  }
}

/**
 * List interviews for a date or upcoming range (public). Course is optional — when
 * omitted, returns interviews across all courses so the "view schedule" button shows everything.
 *
 * Query:
 *  - date=YYYY-MM-DD → one calendar day (default: today)
 *  - from=&to= → inclusive range; if only from, spans 14 days
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
    const { course, date, from, to } = req.query;
    const { start, end } =
      from || to
        ? scheduleRangeBoundsFromInput(from || date, to)
        : scheduleDayBoundsFromInput(date);

    const params = [start.toISOString(), end.toISOString()];
    let courseFilter = '';
    if (course) {
      params.push(course);
      courseFilter = `AND s.course = $${params.length}`;
    }

    const r = await query(
      `SELECT i.id, i.company, i.round, i.date, i."timeSlot", i.status::text, false as pending,
              s.name as "studentName", s.course as "studentCourse"
       FROM "Interview" i
       JOIN "Student" s ON s.id = i."studentId"
       WHERE i.date >= $1 AND i.date <= $2
         ${courseFilter}

       UNION ALL

       SELECT r.id, r.company, r.round, r.date, r."timeSlot", r.status::text, true as pending,
              s.name as "studentName", s.course as "studentCourse"
       FROM "StudentInterviewRequest" r
       JOIN "Student" s ON s.id = r."studentId"
       WHERE r.date >= $1 AND r.date <= $2
         AND r.status = 'SUBMITTED'
         ${courseFilter}

       ORDER BY date ASC, "timeSlot" ASC`,
      params
    );

    const rows = r.rows.map((row) => ({
      ...row,
      date: row.date ? calendarDateInScheduleTz(row.date) : null,
    }));

    return success(res, rows);
  } catch (err) {
    next(err);
  }
}
