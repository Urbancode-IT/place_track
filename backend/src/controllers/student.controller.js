import { query } from '../config/db.js';
import { success, successWithPagination } from '../utils/response.utils.js';
import { getPaginationParams, buildPaginationResponse } from '../utils/pagination.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export async function list(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const conds = [];
    const vals = [];
    let idx = 1;
    let joinSql = '';
    if (req.query.course) { conds.push(`s.course = $${idx++}`); vals.push(req.query.course); }
    if (req.query.batchId) { conds.push(`s."batchId" = $${idx++}`); vals.push(req.query.batchId); }
    if (req.query.search) { conds.push(`(s.name ILIKE $${idx} OR s.email ILIKE $${idx})`); vals.push(`%${req.query.search}%`); idx++; }
    if (req.user.role === 'TRAINER') {
      joinSql = ` INNER JOIN "Interview" i ON i."studentId" = s.id INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id AND it."trainerId" = $${idx}`;
      vals.push(req.user.id);
      idx++;
    }
    if (req.query.status) {
      if (!joinSql) joinSql = ` INNER JOIN "Interview" i ON i."studentId" = s.id`;
      conds.push(`i.status = $${idx++}`);
      vals.push(req.query.status);
    }
    const whereSql = conds.length ? ' WHERE ' + conds.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(DISTINCT s.id)::int as total FROM "Student" s${joinSql}${whereSql}`,
      vals
    );
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const studentsResult = await query(
      `SELECT DISTINCT s.* FROM "Student" s${joinSql}${whereSql} ORDER BY s."createdAt" DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, skip]
    );
    const students = studentsResult.rows;
    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) {
      const pagination = buildPaginationResponse(0, page, limit);
      return successWithPagination(res, [], pagination);
    }
    const latestInterviews = await query(
      `SELECT DISTINCT ON (i."studentId") i.*, 
        (SELECT json_agg(json_build_object('id', u.id, 'name', u.name)) FROM "InterviewTrainer" it2 JOIN "User" u ON u.id = it2."trainerId" WHERE it2."interviewId" = i.id) as trainers
       FROM "Interview" i WHERE i."studentId" = ANY($1) ORDER BY i."studentId", i.date DESC`,
      [studentIds]
    );
    const interviewMap = {};
    for (const row of latestInterviews.rows) {
      interviewMap[row.studentId] = { ...row, trainers: row.trainers || [] };
    }
    const studentsWithInterviews = students.map((s) => ({
      ...s,
      interviews: interviewMap[s.id] ? [interviewMap[s.id]] : [],
    }));
    const pagination = buildPaginationResponse(total, page, limit);
    return successWithPagination(res, studentsWithInterviews, pagination);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.validated;
    const s = await query('SELECT * FROM "Student" WHERE id = $1', [id]);
    const student = s.rows[0];
    if (!student) throw new AppError('Student not found', 404);
    const interviews = await query(
      `SELECT i.*, (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email)) FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = i.id) as trainers
       FROM "Interview" i WHERE i."studentId" = $1 ORDER BY i.date DESC`,
      [id]
    );
    const qa = await query('SELECT * FROM "QAEntry" WHERE "studentId" = $1 ORDER BY "createdAt" DESC', [id]);
    if (req.user.role === 'TRAINER') {
      const hasAccess = interviews.rows.some((i) => (i.trainers || []).some((t) => t.id === req.user.id));
      if (!hasAccess) throw new AppError('Access denied', 403);
    }
    const result = {
      ...student,
      interviews: interviews.rows.map((i) => ({ ...i, trainers: i.trainers || [] })),
      qaEntries: qa.rows,
    };
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, email, phone, course, batchId, selfIntro } = req.validated;
    const r = await query(
      `INSERT INTO "Student" (name, email, phone, course, "batchId", "selfIntro") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email || null, phone || null, course, batchId || null, selfIntro || null]
    );
    return success(res, r.rows[0], 'Student created', 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id, ...data } = req.validated;
    const fields = [];
    const values = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
    if (data.email !== undefined) { fields.push(`email = $${i++}`); values.push(data.email); }
    if (data.phone !== undefined) { fields.push(`phone = $${i++}`); values.push(data.phone); }
    if (data.course !== undefined) { fields.push(`course = $${i++}`); values.push(data.course); }
    if (data.batchId !== undefined) { fields.push(`"batchId" = $${i++}`); values.push(data.batchId); }
    if (data.selfIntro !== undefined) { fields.push(`"selfIntro" = $${i++}`); values.push(data.selfIntro); }
    if (fields.length === 0) {
      const s = await query('SELECT * FROM "Student" WHERE id = $1', [id]);
      return success(res, s.rows[0]);
    }
    fields.push(`"updatedAt" = now()`);
    values.push(id);
    const r = await query(
      `UPDATE "Student" SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!r.rows[0]) throw new AppError('Student not found', 404);
    return success(res, r.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.validated;
    await query('DELETE FROM "Student" WHERE id = $1', [id]);
    return success(res, null, 'Student deleted');
  } catch (err) {
    next(err);
  }
}

export async function getInterviews(req, res, next) {
  try {
    const { id } = req.validated;
    const r = await query(
      `SELECT i.*, (SELECT json_agg(json_build_object('id', u.id, 'name', u.name)) FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = i.id) as trainers
       FROM "Interview" i WHERE i."studentId" = $1 ORDER BY i.date DESC`,
      [id]
    );
    return success(res, r.rows.map((i) => ({ ...i, trainers: i.trainers || [] })));
  } catch (err) {
    next(err);
  }
}

export async function getQa(req, res, next) {
  try {
    const { id } = req.validated;
    const r = await query('SELECT * FROM "QAEntry" WHERE "studentId" = $1 ORDER BY "createdAt" DESC', [id]);
    return success(res, r.rows);
  } catch (err) {
    next(err);
  }
}

export async function updateSelfIntro(req, res, next) {
  try {
    const { id, selfIntro } = req.validated;
    const r = await query('UPDATE "Student" SET "selfIntro" = $1, "updatedAt" = now() WHERE id = $2 RETURNING *', [selfIntro, id]);
    if (!r.rows[0]) throw new AppError('Student not found', 404);
    return success(res, r.rows[0]);
  } catch (err) {
    next(err);
  }
}
