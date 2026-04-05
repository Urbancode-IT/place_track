import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export async function list(req, res, next) {
  try {
    const { id } = req.validated;
    const r = await query('SELECT * FROM "QAEntry" WHERE "studentId" = $1 ORDER BY "createdAt" DESC', [id]);
    return success(res, r.rows);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { id, question, answer, category, status } = req.validated;
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
    await query('DELETE FROM "QAEntry" WHERE id = $1', [id]);
    return success(res, null, 'QA entry deleted');
  } catch (err) {
    next(err);
  }
}
