import { query, withTransaction } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { applyInterviewFinishOutcome } from '../services/interviewFinishApply.service.js';
import { notifyGoogleChatInterviewOutcomeApproved } from '../services/googleChatInterviewNotify.service.js';

export async function list(req, res, next) {
  try {
    const r = await query(
      `SELECT f.*, s.name as "studentName", s.email as "studentEmail", s.course,
              i.company as "interviewCompany", i.round as "interviewRound", i.status as "currentInterviewStatus"
       FROM "InterviewFinishRequest" f
       JOIN "Student" s ON s.id = f."studentId"
       JOIN "Interview" i ON i.id = f."interviewId"
       WHERE f.status = 'SUBMITTED'
       ORDER BY f."submittedAt" DESC`
    );
    const rows = r.rows;
    const allIds = [
      ...new Set(
        rows.flatMap((row) => (Array.isArray(row.proposedTrainerIds) ? row.proposedTrainerIds : []).filter(Boolean))
      ),
    ];
    let nameById = {};
    if (allIds.length) {
      const nm = await query('SELECT id, name FROM "User" WHERE id = ANY($1::text[])', [allIds]);
      nameById = Object.fromEntries(nm.rows.map((x) => [x.id, x.name]));
    }
    for (const row of rows) {
      const ids = Array.isArray(row.proposedTrainerIds) ? row.proposedTrainerIds : [];
      if (row.proposedTrainerIds == null) {
        row.proposedTrainersDisplay = '— (unchanged)';
      } else if (ids.length === 0) {
        row.proposedTrainersDisplay = 'Clear trainers';
      } else {
        row.proposedTrainersDisplay = ids.map((id) => nameById[id] || id).join(', ');
      }
    }
    return success(res, rows);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}

export async function approve(req, res, next) {
  try {
    const { id } = req.validated;

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

      // applyInterviewFinishOutcome uses pool query — run outside client would break atomicity.
      // Mark approved only after apply; hold lock until commit.
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
        [req.user.id, id]
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

    return success(res, { interview: u, proposedStatus }, 'Approved — interview status updated');
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.validated;
    const claim = await query(
      `UPDATE "InterviewFinishRequest"
       SET status = 'REJECTED', "reviewedAt" = now(), "reviewedByUserId" = $1, "updatedAt" = now()
       WHERE id = $2 AND status = 'SUBMITTED'
       RETURNING id`,
      [req.user.id, id]
    );
    if (!claim.rows[0]) {
      const fr = await query('SELECT status FROM "InterviewFinishRequest" WHERE id = $1', [id]);
      if (!fr.rows[0]) throw new AppError('Request not found', 404);
      throw new AppError('Only submitted requests can be rejected', 400);
    }
    return success(res, null, 'Request rejected — interview unchanged');
  } catch (err) {
    next(err);
  }
}
