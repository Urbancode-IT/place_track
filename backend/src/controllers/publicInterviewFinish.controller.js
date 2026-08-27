import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { getTrainersForInterview, resolveInterviewForFinish } from '../services/interviewFinishLookup.service.js';

async function resolveStudentByEmail(studentEmail) {
  const norm = studentEmail.trim().toLowerCase();
  const dup = await query(
    `SELECT id FROM "Student" WHERE email IS NOT NULL AND LOWER(TRIM(email)) = $1 LIMIT 2`,
    [norm]
  );
  if (dup.rows.length === 0) {
    throw new AppError('No student found with this email.', 404);
  }
  if (dup.rows.length > 1) {
    throw new AppError('Multiple profiles use this email. Contact placement.', 400);
  }
  return dup.rows[0].id;
}

export async function previewFinish(req, res, next) {
  try {
    const { studentEmail, company } = req.validated;
    const studentId = await resolveStudentByEmail(studentEmail);
    const interview = await resolveInterviewForFinish(studentId, company);
    if (!interview) {
      throw new AppError(
        'No interview found. Type the company name as on your schedule (e.g. same spelling as Schedule / dashboard).',
        404
      );
    }
    const trainers = await getTrainersForInterview(interview.id);
    const s = await query('SELECT name FROM "Student" WHERE id = $1', [studentId]);
    return success(res, {
      studentName: s.rows[0]?.name,
      interview: {
        id: interview.id,
        company: interview.company,
        round: interview.round,
        timeSlot: interview.timeSlot,
        status: interview.status,
      },
      trainers,
      // Only trainers already on this interview (no global directory leak).
      trainerOptions: trainers.map((t) => ({ id: t.id, name: t.name })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public finish → enqueue InterviewFinishRequest (admin must approve).
 * Does NOT mutate the live interview.
 */
export async function applyFinishOpen(req, res, next) {
  try {
    const {
      studentEmail,
      company,
      proposedStatus,
      feedback,
      trainerReviewRating,
      trainerReviewNotes,
      trainerIds,
      rescheduleDate,
      rescheduleTimeSlot,
    } = req.validated;
    const studentId = await resolveStudentByEmail(studentEmail);
    const interview = await resolveInterviewForFinish(studentId, company);
    if (!interview) {
      throw new AppError(
        'No interview found for this email and company. Use “Check interview” first or match the company name on your schedule.',
        404
      );
    }
    const interviewId = interview.id;

    const proposedTrainerIds =
      trainerIds === undefined || trainerIds === null ? null : [...new Set(trainerIds.map(String))];

    if (proposedTrainerIds != null && proposedTrainerIds.length) {
      const chk = await query(
        `SELECT id FROM "User" WHERE id = ANY($1::text[]) AND role = 'TRAINER'`,
        [proposedTrainerIds]
      );
      if (chk.rows.length !== proposedTrainerIds.length) {
        throw new AppError('One or more trainer IDs are invalid', 400);
      }
    }

    const existing = await query(
      `SELECT id FROM "InterviewFinishRequest"
       WHERE "interviewId" = $1 AND status = 'SUBMITTED' LIMIT 1`,
      [interviewId]
    );
    if (existing.rows[0]) {
      throw new AppError(
        'A finish submission for this interview is already waiting for approval. Contact placement if you need to change it.',
        409
      );
    }

    const rescheduleTs =
      proposedStatus === 'RESCHEDULED' && rescheduleDate
        ? new Date(rescheduleDate)
        : null;
    const rescheduleOk = rescheduleTs && !Number.isNaN(rescheduleTs.getTime());

    await query(
      `INSERT INTO "InterviewFinishRequest" (
         "studentId", "interviewId", "proposedStatus", feedback, "proposedTrainerIds",
         "trainerReviewRating", "trainerReviewNotes", "rescheduleDate", "rescheduleTimeSlot",
         status, "submittedAt"
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SUBMITTED', now())`,
      [
        studentId,
        interviewId,
        proposedStatus,
        feedback || null,
        proposedTrainerIds,
        trainerReviewRating || null,
        trainerReviewNotes?.trim() || null,
        proposedStatus === 'RESCHEDULED' && rescheduleOk ? rescheduleTs.toISOString() : null,
        proposedStatus === 'RESCHEDULED' ? rescheduleTimeSlot || null : null,
      ]
    );

    return success(
      res,
      { ok: true, pendingApproval: true },
      'Submitted. Your placement team will review and update the interview.'
    );
  } catch (err) {
    // Columns missing if migrate not run — surface clear message
    if (err?.code === '42703') {
      return next(
        new AppError(
          'Server needs InterviewFinishRequest migration (trainer review / reschedule columns). Run: node scripts/migrate-interview-finish-extra.js',
          500
        )
      );
    }
    next(err);
  }
}
