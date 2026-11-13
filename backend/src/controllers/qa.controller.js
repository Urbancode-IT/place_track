import { query } from '../config/db.js';
import { success, successWithPagination } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertCanAccessStudent } from '../utils/interviewAccess.utils.js';
import { getPaginationParams, buildPaginationResponse } from '../utils/pagination.utils.js';

export async function list(req, res, next) {
  try {
    const { id } = req.validated;
    await assertCanAccessStudent(req.user, id);
    const r = await query('SELECT * FROM "QAEntry" WHERE "studentId" = $1 ORDER BY "createdAt" DESC', [id]);
    return success(res, r.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin Questions module — all QA entries with filters
 * (course, topic/category, status, search, student).
 */
export async function listAdmin(req, res, next) {
  try {
    const v = req.validated || {};
    const { page, limit, skip } = getPaginationParams({
      page: v.page,
      limit: v.limit ?? 20,
    });

    const where = ['1=1'];
    const vals = [];
    let i = 1;

    // Trainers only see students they are assigned to
    if (req.user?.role === 'TRAINER') {
      where.push(`EXISTS (
        SELECT 1 FROM "Interview" i
        JOIN "InterviewTrainer" it ON it."interviewId" = i.id
        WHERE i."studentId" = q."studentId" AND it."trainerId" = $${i}
      )`);
      vals.push(req.user.id);
      i += 1;
    }

    if (v.course?.trim()) {
      where.push(`s.course = $${i++}`);
      vals.push(v.course.trim());
    }
    if (v.status) {
      where.push(`q.status = $${i++}`);
      vals.push(v.status);
    }
    if (v.studentId?.trim()) {
      where.push(`q."studentId" = $${i++}`);
      vals.push(v.studentId.trim());
    }
    if (v.topic?.trim()) {
      // Matches "Company · Topic" suffix or plain category / topic substring
      where.push(`(
        q.category ILIKE $${i}
        OR q.category ILIKE $${i + 1}
        OR split_part(COALESCE(q.category, ''), ' · ', 2) ILIKE $${i + 2}
      )`);
      const t = v.topic.trim();
      vals.push(`%${t}%`, `% · ${t}`, t);
      i += 3;
    }
    if (v.search?.trim()) {
      const q = `%${v.search.trim()}%`;
      where.push(`(
        q.question ILIKE $${i}
        OR COALESCE(q.answer, '') ILIKE $${i}
        OR COALESCE(q.category, '') ILIKE $${i}
        OR s.name ILIKE $${i}
        OR COALESCE(s.email, '') ILIKE $${i}
      )`);
      vals.push(q);
      i += 1;
    }

    const whereSql = where.join(' AND ');

    const countR = await query(
      `SELECT COUNT(*)::int AS c
       FROM "QAEntry" q
       JOIN "Student" s ON s.id = q."studentId"
       WHERE ${whereSql}`,
      vals
    );
    const total = countR.rows[0]?.c || 0;

    const listVals = [...vals, limit, skip];
    const r = await query(
      `SELECT q.id, q.question, q.answer, q.category, q.status, q."createdAt",
              q."studentId", s.name AS "studentName", s.email AS "studentEmail", s.course
       FROM "QAEntry" q
       JOIN "Student" s ON s.id = q."studentId"
       WHERE ${whereSql}
       ORDER BY q."createdAt" DESC
       LIMIT $${i++} OFFSET $${i}`,
      listVals
    );

    return successWithPagination(res, r.rows, buildPaginationResponse(total, page, limit));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { id, question, answer, category, status } = req.validated;
    await assertCanAccessStudent(req.user, id);
    const s = await query('SELECT id FROM "Student" WHERE id = $1', [id]);
    if (!s.rows[0]) throw new AppError('Student not found', 404);
    const r = await query(
      `INSERT INTO "QAEntry" ("studentId", question, answer, category, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, question, answer || null, category || null, status || 'PENDING']
    );
    return success(res, r.rows[0], 'QA entry added', 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id, question, answer, category, status } = req.validated;
    const existing = await query('SELECT "studentId" FROM "QAEntry" WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new AppError('QA entry not found', 404);
    await assertCanAccessStudent(req.user, existing.rows[0].studentId);
    const updates = [];
    const vals = [];
    let i = 1;
    if (question !== undefined) { updates.push(`question = $${i++}`); vals.push(question); }
    if (answer !== undefined) { updates.push(`answer = $${i++}`); vals.push(answer); }
    if (category !== undefined) { updates.push(`category = $${i++}`); vals.push(category); }
    if (status !== undefined) { updates.push(`status = $${i++}`); vals.push(status); }
    if (updates.length === 0) {
      const r = await query('SELECT * FROM "QAEntry" WHERE id = $1', [id]);
      return success(res, r.rows[0]);
    }
    vals.push(id);
    const r = await query(`UPDATE "QAEntry" SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, vals);
    if (!r.rows[0]) throw new AppError('QA entry not found', 404);
    return success(res, r.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.validated;
    const existing = await query('SELECT "studentId" FROM "QAEntry" WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new AppError('QA entry not found', 404);
    await assertCanAccessStudent(req.user, existing.rows[0].studentId);
    await query('DELETE FROM "QAEntry" WHERE id = $1', [id]);
    return success(res, null, 'QA entry deleted');
  } catch (err) {
    next(err);
  }
}
