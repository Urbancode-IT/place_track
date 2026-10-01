import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendInterviewScheduled } from '../services/email.service.js';

export async function list(req, res, next) {
  try {
    const r = await query(
      'SELECT id, name, email, phone, allowed FROM "User" WHERE role = $1',
      ['TRAINER']
    );
    return success(res, r.rows);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, email, password, phone } = req.validated;
    const existing = await query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (existing.rows.length) throw new AppError('Email already registered', 400);
    const hashed = await bcrypt.hash(password, 10);
    const r = await query(
      `INSERT INTO "User" (id, name, email, password, role, phone, allowed)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, true)
       RETURNING id, name, email, phone, allowed, "createdAt"`,
      [name, email, hashed, 'TRAINER', phone || null]
    );
    const user = r.rows[0];
    return success(
      res,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        allowed: user.allowed === true,
        createdAt: user.createdAt,
      },
      'Trainer registered and admitted',
      201
    );
  } catch (err) {
    next(err);
  }
}

async function setTrainerAllowed(req, res, next, allowed) {
  try {
    const { id } = req.validated;
    const r = await query(
      'UPDATE "User" SET allowed = $1 WHERE id = $2 AND role = $3 RETURNING id, allowed',
      [allowed, id, 'TRAINER']
    );
    const row = r.rows[0];
    if (!row) throw new AppError('Trainer not found', 404);
    return success(res, { id: row.id, allowed: row.allowed === true });
  } catch (err) {
    next(err);
  }
}

export function allow(req, res, next) {
  return setTrainerAllowed(req, res, next, true);
}

export function reject(req, res, next) {
  return setTrainerAllowed(req, res, next, false);
}

export const revoke = reject;

export async function remove(req, res, next) {
  try {
    const { id } = req.validated;
    const row = await withTransaction(async (client) => {
      const existing = await client.query(
        'SELECT id, name FROM "User" WHERE id = $1 AND role = $2',
        [id, 'TRAINER']
      );
      const trainer = existing.rows[0];
      if (!trainer) return null;

      await client.query('SAVEPOINT snapshot_spoc_name');
      try {
        await client.query(
          `UPDATE "JobApplicationDaily"
           SET "spocName" = COALESCE(NULLIF(btrim("spocName"), ''), $2)
           WHERE "spocUserId" = $1`,
          [id, trainer.name]
        );
        await client.query('RELEASE SAVEPOINT snapshot_spoc_name');
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT snapshot_spoc_name');
        if (err?.code !== '42P01' && err?.code !== '42703') throw err;
      }

      const deleted = await client.query(
        'DELETE FROM "User" WHERE id = $1 AND role = $2 RETURNING id, name',
        [id, 'TRAINER']
      );
      return deleted.rows[0] || null;
    });
    if (!row) throw new AppError('Trainer not found', 404);
    return success(res, null, 'Trainer deleted');
  } catch (err) {
    if (err?.code === '23001' || err?.code === '23503') {
      return next(
        new AppError(
          'This trainer is linked to other records and cannot be deleted. Reject them instead.',
          409
        )
      );
    }
    next(err);
  }
}

export async function getInterviews(req, res, next) {
  try {
    const { id } = req.validated;
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      throw new AppError('Access denied', 403);
    }
    const r = await query(
      `SELECT i.*, s.id as "s_id", s.name as "s_name", s.course as "s_course" FROM "Interview" i
       INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id AND it."trainerId" = $1
       JOIN "Student" s ON s.id = i."studentId" ORDER BY i.date ASC`,
      [id]
    );
    const interviews = r.rows.map((row) => ({
      ...row,
      student: { id: row.s_id, name: row.s_name, course: row.s_course },
    }));
    return success(res, interviews);
  } catch (err) {
    next(err);
  }
}

export async function notifyTrainer(req, res, next) {
  try {
    const { id } = req.validated;
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      throw new AppError('Access denied', 403);
    }
    const t = await query(
      'SELECT * FROM "User" WHERE id = $1 AND role IN (\'TRAINER\', \'ADMIN\')',
      [id]
    );
    const trainer = t.rows[0];
    if (!trainer) throw new AppError('Trainer not found', 404);
    const interviewId = req.body?.interviewId;
    if (!interviewId) throw new AppError('interviewId required', 400);
    const assigned = await query(
      'SELECT 1 FROM "InterviewTrainer" WHERE "interviewId" = $1 AND "trainerId" = $2',
      [interviewId, id]
    );
    if (!assigned.rows[0] && req.user.role !== 'ADMIN') {
      throw new AppError('Trainer is not assigned to this interview', 403);
    }
    const i = await query('SELECT i.*, s.name FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1', [interviewId]);
    const interview = i.rows[0];
    if (!interview) throw new AppError('Interview not found', 404);
    const data = {
      studentName: interview.name,
      company: interview.company,
      round: interview.round,
      date: interview.date,
      timeSlot: interview.timeSlot,
      hrNumber: interview.hrNumber,
      room: interview.room,
    };
    await sendInterviewScheduled(trainer.email, trainer.name, { ...data, date: interview.date?.toISOString?.()?.split('T')[0] || data.date });
    await query('UPDATE "InterviewTrainer" SET "notifiedAt" = now() WHERE "interviewId" = $1 AND "trainerId" = $2', [interviewId, id]);
    return success(res, null, 'Notification sent');
  } catch (err) {
    next(err);
  }
}
