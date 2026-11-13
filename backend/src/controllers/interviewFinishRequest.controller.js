import { success } from '../utils/response.utils.js';
import { query } from '../config/db.js';
import {
  approveInterviewFinishRequest,
  rejectInterviewFinishRequest,
} from '../services/interviewFinishApproval.service.js';

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
    const result = await approveInterviewFinishRequest(id, req.user.id);
    return success(res, result, 'Approved — interview status updated');
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.validated;
    await rejectInterviewFinishRequest(id, req.user.id);
    return success(res, null, 'Request rejected — interview unchanged');
  } catch (err) {
    next(err);
  }
}
