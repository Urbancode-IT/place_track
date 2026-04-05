import pool, { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getCommonMeta(_req, res, next) {
  try {
    return success(res, {
      canSubmit: true,
      message: 'Use the email registered with your placement profile.',
    });
  } catch (err) {
    next(err);
  }
}

export async function submitCommon(req, res, next) {
  try {
    const { email, content } = req.validated;
    const s = await query(
      `SELECT id, name FROM "Student"
       WHERE email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1))
       LIMIT 1`,
      [email]
    );
    const student = s.rows[0];
    if (!student) {
      throw new AppError('No student found with this email. Use the same email as in your profile.', 404);
    }
    await query(
      `INSERT INTO "StudentHonestReview" ("studentId", "linkToken", content)
       VALUES ($1, NULL, $2)`,
      [student.id, content.trim()]
    );
    return success(res, { ok: true }, 'Thank you. Your honest review was submitted.', 201);
  } catch (err) {
    if (err.code === '42P01') {
      console.error('[honest-review] Missing tables — run: npm run db:migrate-student-honest-review (backend)');
      return next(
        new AppError(
          'Honest review is not set up on the server yet. Please contact your placement team.',
          503
        )
      );
    }
    next(err);
  }
}

export async function getByToken(req, res, next) {
  try {
    const { token } = req.validated;
    const r = await query(
      `SELECT l.token, l."usedAt", s.name as "studentName", s.course
       FROM "HonestReviewLink" l
       JOIN "Student" s ON s.id = l."studentId"
       WHERE l.token = $1`,
      [token]
    );
    const row = r.rows[0];
    if (!row) throw new AppError('Invalid link', 404);
    const firstName = (row.studentName || '').split(/\s+/)[0] || 'Student';
    const canSubmit = !row.usedAt;
    return success(res, {
      studentFirstName: firstName,
      course: row.course,
      canSubmit,
      message: row.usedAt
        ? 'This link was already used. Ask your placement team for a new link if you need to update.'
        : null,
    });
  } catch (err) {
    if (err.code === '42P01') return next(new AppError('Service unavailable', 503));
    next(err);
  }
}

export async function submitByToken(req, res, next) {
  const { token, content } = req.validated;
  try {
    const r = await query(
      `SELECT l.token, l."studentId", l."usedAt" FROM "HonestReviewLink" l WHERE l.token = $1`,
      [token]
    );
    const row = r.rows[0];
    if (!row) throw new AppError('Invalid link', 404);
    if (row.usedAt) {
      throw new AppError('This link was already used', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO "StudentHonestReview" ("studentId", "linkToken", content)
         VALUES ($1, $2, $3) RETURNING id`,
        [row.studentId, token, content.trim()]
      );
      await client.query(`UPDATE "HonestReviewLink" SET "usedAt" = now() WHERE token = $1`, [token]);
      await client.query('COMMIT');
      return success(res, { id: ins.rows[0].id }, 'Thank you. Your honest review was submitted.', 201);
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '42P01') return next(new AppError('Service unavailable', 503));
    next(err);
  }
}
