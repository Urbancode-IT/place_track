import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendInterviewScheduled } from '../services/email.service.js';

export async function list(req, res, next) {
  try {
    const r = await query('SELECT id, name, email, phone FROM "User" WHERE role = $1', ['TRAINER']);
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
      'INSERT INTO "User" (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, "createdAt"',
      [name, email, hashed, 'TRAINER', phone || null]
    );
    const user = r.rows[0];
    return success(res, { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt }, 'Trainer created', 201);
  } catch (err) {
    next(err);
  }
}

export async function getInterviews(req, res, next) {
  try {
    const { id } = req.validated;
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
    const t = await query(
      'SELECT * FROM "User" WHERE id = $1 AND role IN (\'TRAINER\', \'ADMIN\')',
      [id]
    );
    const trainer = t.rows[0];
    if (!trainer) throw new AppError('Trainer not found', 404);
    const interviewId = req.body?.interviewId;
    if (!interviewId) throw new AppError('interviewId required', 400);
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
