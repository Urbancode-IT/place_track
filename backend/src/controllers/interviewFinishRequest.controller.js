import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { applyInterviewFinishOutcome } from '../services/interviewFinishApply.service.js';

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
    const fr = await query('SELECT * FROM "InterviewFinishRequest" WHERE id = $1', [id]);
    const row = fr.rows[0];
    if (!row) throw new AppError('Request not found', 404);
    if (row.status !== 'SUBMITTED') throw new AppError('Only submitted requests can be approved', 400);

    const { interview: u, proposedStatus } = await applyInterviewFinishOutcome(row.interviewId, {
      proposedStatus: row.proposedStatus,
      feedback: row.feedback,
      proposedTrainerIds: row.proposedTrainerIds,
    });

    await query(
      `UPDATE "InterviewFinishRequest"
       SET status = 'APPROVED', "reviewedAt" = now(), "reviewedByUserId" = $1, "updatedAt" = now()
       WHERE id = $2`,
      [req.user.id, id]
    );

    return success(res, { interview: u, proposedStatus }, 'Approved — interview status updated');
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.validated;
    const fr = await query('SELECT * FROM "InterviewFinishRequest" WHERE id = $1', [id]);
    const row = fr.rows[0];
    if (!row) throw new AppError('Request not found', 404);
    if (row.status !== 'SUBMITTED') throw new AppError('Only submitted requests can be rejected', 400);
    await query(
      `UPDATE "InterviewFinishRequest"
       SET status = 'REJECTED', "reviewedAt" = now(), "reviewedByUserId" = $1, "updatedAt" = now()
       WHERE id = $2`,
      [req.user.id, id]
    );
    return success(res, null, 'Request rejected — interview unchanged');
  } catch (err) {
    next(err);
  }
}
