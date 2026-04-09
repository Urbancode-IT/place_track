import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Public endpoint to quickly register a student.
 */
export async function publicCreateStudent(req, res, next) {
  try {
    const { name, email, phone, course, batchId } = req.validated;
    
    // Check if email already exists
    if (email) {
      const existing = await query('SELECT id FROM "Student" WHERE LOWER(email) = LOWER($1)', [email.trim()]);
      if (existing.rows[0]) {
        throw new AppError('A student with this email already exists.', 400);
      }
    }

    const r = await query(
      `INSERT INTO "Student" (id, name, email, phone, course, "batchId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now(), now())
       RETURNING *`,
      [name, email?.trim() || null, phone || null, course, batchId || null]
    );

    return success(res, r.rows[0], 'Student registered successfully. You can now submit your interview details.', 201);
  } catch (err) {
    next(err);
  }
}
