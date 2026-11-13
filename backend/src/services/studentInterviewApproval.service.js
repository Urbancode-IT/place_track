import { query, withTransaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { createInterviewWithTrainers } from './interviewCreate.service.js';
import { attachStudentMeetingLink } from './jobApplicationSlots.service.js';

/**
 * @param {string} id
 * @param {string|null} reviewerUserId
 * @param {{ trainerIds?: string[], room?: string|null }} [opts]
 */
export async function approveStudentInterviewRequest(id, reviewerUserId = null, opts = {}) {
  const { trainerIds = [], room: roomFromApprove } = opts;

  const result = await withTransaction(async (client) => {
    const locked = await client.query(
      `SELECT * FROM "StudentInterviewRequest" WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const row = locked.rows[0];
    if (!row) throw new AppError('Request not found', 404);
    if (row.status !== 'SUBMITTED') {
      throw new AppError('Only submitted requests can be approved', 400);
    }
    if (!row.company || !row.round || !row.date || !row.timeSlot) {
      throw new AppError('Request is missing required fields', 400);
    }
    const interviewDate = new Date(row.date);
    if (Number.isNaN(interviewDate.getTime())) {
      throw new AppError('Invalid interview date in request', 400);
    }
    const mergedComments = row.comments || null;
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
      dbQuery: (text, params) => client.query(text, params),
    });

    const claim = await client.query(
      `UPDATE "StudentInterviewRequest"
       SET status = 'APPROVED', "reviewedAt" = now(), "reviewedByUserId" = $1, "resultingInterviewId" = $2, "updatedAt" = now()
       WHERE id = $3 AND status = 'SUBMITTED'
       RETURNING id`,
      [reviewerUserId, interview.id, id]
    );
    if (!claim.rows[0]) {
      throw new AppError('Only submitted requests can be approved', 400);
    }
    return { interview, student, requestId: id };
  });

  await attachStudentMeetingLink({
    studentId: result.student?.id || result.interview?.studentId,
    company: result.interview?.company,
    date: result.interview?.date,
    timeSlot: result.interview?.timeSlot,
    meetingLink: result.interview?.room,
    interviewId: result.interview?.id,
  });

  return result;
}

/**
 * @param {string} id
 * @param {string|null} reviewerUserId
 */
export async function rejectStudentInterviewRequest(id, reviewerUserId = null) {
  const claim = await query(
    `UPDATE "StudentInterviewRequest"
     SET status = 'REJECTED', "reviewedAt" = now(), "reviewedByUserId" = $1, "updatedAt" = now()
     WHERE id = $2 AND status = 'SUBMITTED'
     RETURNING id`,
    [reviewerUserId, id]
  );
  if (!claim.rows[0]) {
    const r = await query('SELECT status FROM "StudentInterviewRequest" WHERE id = $1', [id]);
    if (!r.rows[0]) throw new AppError('Request not found', 404);
    throw new AppError('Only submitted requests can be rejected', 400);
  }
  return { id };
}
