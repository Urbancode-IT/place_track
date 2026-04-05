import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { getTrainersForInterview, resolveInterviewForFinish } from '../services/interviewFinishLookup.service.js';
import { applyInterviewFinishOutcome } from '../services/interviewFinishApply.service.js';

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
    const [trainers, trainerOptions] = await Promise.all([
      getTrainersForInterview(interview.id),
      query(`SELECT id, name FROM "User" WHERE role = 'TRAINER' ORDER BY name`),
    ]);
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
      trainerOptions: trainerOptions.rows,
    });
  } catch (err) {
    next(err);
  }
}

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
    /* undefined/omit = leave trainers unchanged; [] would clear all — treat missing as null */
    const proposedTrainerIds =
      trainerIds === undefined || trainerIds === null ? null : trainerIds;

    await applyInterviewFinishOutcome(interviewId, {
      proposedStatus,
      feedback: feedback || null,
      trainerReviewRating,
      trainerReviewNotes: trainerReviewNotes?.trim() || null,
      proposedTrainerIds,
      rescheduleDate: proposedStatus === 'RESCHEDULED' ? rescheduleDate : undefined,
      rescheduleTimeSlot: proposedStatus === 'RESCHEDULED' ? rescheduleTimeSlot : undefined,
    });

    return success(res, { ok: true }, 'Recorded. Interview status and schedule are updated now.');
  } catch (err) {
    next(err);
  }
}
