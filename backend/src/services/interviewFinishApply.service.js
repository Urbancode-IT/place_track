import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendStatusUpdate, sendStudentInterviewRescheduled } from './email.service.js';
import { emitInterviewUpdated } from './socket.service.js';
import { notifyTrainersInterviewScheduleUpdated } from './notification.service.js';

/**
 * Applies outcome + optional trainer list to an interview (same rules as admin approve).
 */
export async function applyInterviewFinishOutcome(interviewId, {
  proposedStatus,
  feedback,
  trainerReviewRating,
  trainerReviewNotes,
  proposedTrainerIds,
  rescheduleDate,
  rescheduleTimeSlot,
}) {
  const iv = await query(
    `SELECT i.*, s.id as "s_id", s.name, s.email, s.course as "s_course"
     FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1`,
    [interviewId]
  );
  const interview = iv.rows[0];
  if (!interview) throw new AppError('Interview not found', 404);

  const ratingLabel =
    trainerReviewRating === 'EXCELLENT'
      ? 'Excellent'
      : trainerReviewRating === 'GOOD'
        ? 'Good'
        : trainerReviewRating === 'BAD'
          ? 'Bad'
          : trainerReviewRating || '';
  const trainerBlock =
    ratingLabel || trainerReviewNotes
      ? `[Trainer review: ${ratingLabel || '—'}]${trainerReviewNotes ? `\n${trainerReviewNotes}` : ''}`
      : '';
  const finishBlock = feedback ? `[Finish form] ${feedback}` : '';
  const note = [finishBlock, trainerBlock].filter(Boolean).join('\n\n');
  const mergedComments = [interview.comments, note].filter(Boolean).join('\n\n') || null;

  const slot = String(rescheduleTimeSlot || '').trim();
  const d = rescheduleDate ? new Date(rescheduleDate) : null;
  const dateOk = d && !Number.isNaN(d.getTime());

  const writeTrainerReview =
    trainerReviewRating === 'GOOD' ||
    trainerReviewRating === 'BAD' ||
    trainerReviewRating === 'EXCELLENT';
  const ratingDb = writeTrainerReview ? trainerReviewRating : null;
  const notesDb = writeTrainerReview ? trainerReviewNotes?.trim() || null : null;

  if (proposedStatus === 'RESCHEDULED') {
    const gaveSchedule = rescheduleDate != null || rescheduleTimeSlot != null;
    if (dateOk && slot) {
      if (writeTrainerReview) {
        await query(
          `UPDATE "Interview" SET status = $1::interview_status_enum, comments = $2, date = $3, "timeSlot" = $4,
           "trainerReviewRating" = $5, "trainerReviewNotes" = $6, "updatedAt" = now() WHERE id = $7`,
          [proposedStatus, mergedComments, d.toISOString(), slot, ratingDb, notesDb, interviewId]
        );
      } else {
        await query(
          `UPDATE "Interview" SET status = $1::interview_status_enum, comments = $2, date = $3, "timeSlot" = $4, "updatedAt" = now() WHERE id = $5`,
          [proposedStatus, mergedComments, d.toISOString(), slot, interviewId]
        );
      }
    } else if (gaveSchedule) {
      throw new AppError('Invalid or incomplete reschedule date / time.', 400);
    } else if (writeTrainerReview) {
      await query(
        `UPDATE "Interview" SET status = $1::interview_status_enum, comments = $2,
         "trainerReviewRating" = $3, "trainerReviewNotes" = $4, "updatedAt" = now() WHERE id = $5`,
        [proposedStatus, mergedComments, ratingDb, notesDb, interviewId]
      );
    } else {
      await query(
        `UPDATE "Interview" SET status = $1::interview_status_enum, comments = $2, "updatedAt" = now() WHERE id = $3`,
        [proposedStatus, mergedComments, interviewId]
      );
    }
  } else if (writeTrainerReview) {
    await query(
      `UPDATE "Interview" SET status = $1::interview_status_enum, comments = $2,
       "trainerReviewRating" = $3, "trainerReviewNotes" = $4, "updatedAt" = now() WHERE id = $5`,
      [proposedStatus, mergedComments, ratingDb, notesDb, interviewId]
    );
  } else {
    await query(
      `UPDATE "Interview" SET status = $1::interview_status_enum, comments = $2, "updatedAt" = now() WHERE id = $3`,
      [proposedStatus, mergedComments, interviewId]
    );
  }

  if (proposedTrainerIds != null) {
    await query('DELETE FROM "InterviewTrainer" WHERE "interviewId" = $1', [interviewId]);
    for (const tid of proposedTrainerIds) {
      const chk = await query(`SELECT id FROM "User" WHERE id = $1 AND role = 'TRAINER'`, [tid]);
      if (chk.rows[0]) {
        await query(
          `INSERT INTO "InterviewTrainer" ("interviewId", "trainerId", "notifiedAt") VALUES ($1, $2, now())
           ON CONFLICT ("interviewId", "trainerId") DO NOTHING`,
          [interviewId, tid]
        );
      }
    }
  }

  const updated = await query(
    'SELECT i.*, s.id as "s_id", s.name, s.email, s.course as "s_course" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1',
    [interviewId]
  );
  const u = updated.rows[0];
  const rescheduleMail =
    proposedStatus === 'RESCHEDULED' && dateOk && slot && u?.email;
  if (rescheduleMail) {
    await sendStudentInterviewRescheduled(u.email, u.name, {
      company: u.company,
      round: u.round,
      date: u.date?.toISOString?.() || u.date,
      timeSlot: u.timeSlot,
      hrNumber: u.hrNumber,
      room: u.room,
    });
  } else if (u?.email) {
    await sendStatusUpdate(u.email, u.name, u.company, proposedStatus);
  }
  if (u) {
    const tr = await query(
      `SELECT it."trainerId", u.id as "u_id", u.name as "u_name" FROM "InterviewTrainer" it
       JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = $1`,
      [interviewId]
    );
    emitInterviewUpdated({
      ...u,
      student: { id: u.s_id, name: u.name, email: u.email, course: u.s_course },
      trainers: tr.rows.map((t) => ({ trainerId: t.trainerId, trainer: { id: t.u_id, name: t.u_name } })),
    });

    if (proposedStatus === 'RESCHEDULED' && dateOk && slot) {
      await query('DELETE FROM "Notification" WHERE "interviewId" = $1 AND type = $2', [
        interviewId,
        'INTERVIEW_30MIN_REMINDER',
      ]);
      const trainerIds = tr.rows.map((row) => row.trainerId).filter(Boolean);
      if (!trainerIds.length) {
        console.warn(
          `[mail] RESCHEDULED interview ${interviewId}: no trainers linked — schedule-updated email skipped`
        );
      } else {
        await notifyTrainersInterviewScheduleUpdated(interviewId, trainerIds, {
          studentName: u.name,
          company: u.company,
          round: u.round,
          date: u.date?.toISOString?.() || u.date,
          timeSlot: u.timeSlot,
          hrNumber: u.hrNumber,
          room: u.room,
        });
      }
    }
  }

  return { interview: u, proposedStatus };
}

