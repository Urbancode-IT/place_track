import { query, withTransaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { applyInterviewFinishOutcome } from './interviewFinishApply.service.js';
import { notifyGoogleChatInterviewOutcomeApproved } from './googleChatInterviewNotify.service.js';

/**
 * @param {string} id - InterviewFinishRequest id
 * @param {string|null} reviewerUserId
 */
export async function approveInterviewFinishRequest(id, reviewerUserId = null) {
  const { u, proposedStatus, interviewId } = await withTransaction(async (client) => {
    const locked = await client.query(
      `SELECT * FROM "InterviewFinishRequest" WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const row = locked.rows[0];
    if (!row) throw new AppError('Request not found', 404);
    if (row.status !== 'SUBMITTED') {
      throw new AppError('Only submitted requests can be approved', 400);
    }

    const applied = await applyInterviewFinishOutcome(row.interviewId, {
      proposedStatus: row.proposedStatus,
      feedback: row.feedback,
      trainerReviewRating: row.trainerReviewRating,
      trainerReviewNotes: row.trainerReviewNotes,
      proposedTrainerIds: row.proposedTrainerIds,
      rescheduleDate: row.rescheduleDate,
      rescheduleTimeSlot: row.rescheduleTimeSlot,
      dbQuery: (text, params) => client.query(text, params),
    });

    await client.query(
      `UPDATE "InterviewFinishRequest"
       SET status = 'APPROVED', "reviewedAt" = now(), "reviewedByUserId" = $1, "updatedAt" = now()
       WHERE id = $2 AND status = 'SUBMITTED'`,
      [reviewerUserId, id]
    );

    return {
      u: applied.interview,
      proposedStatus: applied.proposedStatus,
      interviewId: row.interviewId,
    };
  });

  notifyGoogleChatInterviewOutcomeApproved(interviewId, proposedStatus).catch((e) =>
    console.error('[google-chat] interview outcome approve notify:', e)
  );

  return { interview: u, proposedStatus, interviewId };
}

/**
 * @param {string} id
 * @param {string|null} reviewerUserId
 */
export async function rejectInterviewFinishRequest(id, reviewerUserId = null) {
  const claim = await query(
    `UPDATE "InterviewFinishRequest"
     SET status = 'REJECTED', "reviewedAt" = now(), "reviewedByUserId" = $1, "updatedAt" = now()
     WHERE id = $2 AND status = 'SUBMITTED'
     RETURNING id`,
    [reviewerUserId, id]
  );
  if (!claim.rows[0]) {
    const fr = await query('SELECT status FROM "InterviewFinishRequest" WHERE id = $1', [id]);
    if (!fr.rows[0]) throw new AppError('Request not found', 404);
    throw new AppError('Only submitted requests can be rejected', 400);
  }
  return { id };
}
