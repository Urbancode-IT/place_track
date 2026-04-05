import { query } from '../config/db.js';
import { success, successWithPagination } from '../utils/response.utils.js';
import { getPaginationParams, buildPaginationResponse } from '../utils/pagination.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { createInterviewWithTrainers } from '../services/interviewCreate.service.js';
import { notifyTrainersForInterview, notifyTrainersInterviewScheduleUpdated } from '../services/notification.service.js';
import { emitInterviewUpdated } from '../services/socket.service.js';
import { sendStatusUpdate, sendStudentInterviewRescheduled } from '../services/email.service.js';

export async function list(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { course, status, trainerId, dateFrom, dateTo } = req.query;
    const conds = [];
    const vals = [];
    let idx = 1;
    conds.push('1=1');
    if (status) { conds.push(`i.status = $${idx++}`); vals.push(status); }
    if (dateFrom) { conds.push(`i.date >= $${idx++}`); vals.push(dateFrom); }
    if (dateTo) { conds.push(`i.date <= $${idx++}`); vals.push(dateTo); }
    if (course) { conds.push(`s.course = $${idx++}`); vals.push(course); }
    if (trainerId) { conds.push(`it."trainerId" = $${idx++}`); vals.push(trainerId); }
    if (req.user.role === 'TRAINER') { conds.push(`it."trainerId" = $${idx++}`); vals.push(req.user.id); }
    const whereSql = conds.join(' AND ');
    const joinSql = (trainerId || req.user.role === 'TRAINER') ? ' INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id' : '';
    const countR = await query(
      `SELECT COUNT(*)::int as total FROM "Interview" i INNER JOIN "Student" s ON s.id = i."studentId"${joinSql} WHERE ${whereSql}`,
      vals
    );
    const total = countR.rows[0]?.total || 0;
    const r = await query(
      `SELECT i.*, s.id as "s_id", s.name as "s_name", s.course as "s_course", s.email as "s_email"
       FROM "Interview" i INNER JOIN "Student" s ON s.id = i."studentId"${joinSql} WHERE ${whereSql}
       ORDER BY i.date ASC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, skip]
    );
    const interviewIds = r.rows.map((i) => i.id);
    const trainersR = interviewIds.length ? await query(
      `SELECT it."interviewId", u.id, u.name, u.email FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = ANY($1)`,
      [interviewIds]
    ) : { rows: [] };
    const trainersByInterview = {};
    for (const t of trainersR.rows) {
      if (!trainersByInterview[t.interviewId]) trainersByInterview[t.interviewId] = [];
      trainersByInterview[t.interviewId].push({ id: t.id, name: t.name, email: t.email });
    }
    const interviews = r.rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      company: row.company,
      round: row.round,
      date: row.date,
      timeSlot: row.timeSlot,
      hrNumber: row.hrNumber,
      room: row.room,
      status: row.status,
      comments: row.comments,
      trainerReviewRating: row.trainerReviewRating ?? null,
      trainerReviewNotes: row.trainerReviewNotes ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      student: { id: row.s_id, name: row.s_name, course: row.s_course, email: row.s_email },
      trainers: (trainersByInterview[row.id] || []).map((t) => ({ trainer: t })),
    }));
    const pagination = buildPaginationResponse(total, page, limit);
    return successWithPagination(res, interviews, pagination);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.validated;
    const i = await query('SELECT i.*, s.id as "s_id", s.name as "s_name", s.email as "s_email", s.phone as "s_phone", s.course as "s_course" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1', [id]);
    const row = i.rows[0];
    if (!row) throw new AppError('Interview not found', 404);
    const tr = await query('SELECT it."trainerId", u.id, u.name, u.email, u.phone FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = $1', [id]);
    if (req.user.role === 'TRAINER') {
      const assigned = tr.rows.some((t) => t.trainerId === req.user.id);
      if (!assigned) throw new AppError('Access denied', 403);
    }
    const interview = {
      ...row,
      student: { id: row.s_id, name: row.s_name, email: row.s_email, phone: row.s_phone, course: row.s_course },
      trainers: tr.rows.map((t) => ({ trainerId: t.trainerId, trainer: { id: t.id, name: t.name, email: t.email, phone: t.phone } })),
    };
    return success(res, interview);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { studentId, company, round, date, timeSlot, hrNumber, room, comments, trainerIds } = req.validated;
    const { interview, student, trainerIds: ids } = await createInterviewWithTrainers({
      studentId,
      company,
      round,
      date,
      timeSlot,
      hrNumber,
      room,
      comments,
      trainerIds,
    });
    return success(res, { ...interview, student, trainers: ids.map((tid) => ({ trainerId: tid })) }, 'Interview scheduled', 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id, ...data } = req.validated;
    const beforeIv = await query(
      `SELECT i.*, s.name as "studentName" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1`,
      [id]
    );
    const before = beforeIv.rows[0];
    if (!before) throw new AppError('Interview not found', 404);

    const prevTr = await query('SELECT "trainerId" FROM "InterviewTrainer" WHERE "interviewId" = $1', [id]);
    const prevTrainerSet = new Set(prevTr.rows.map((r) => r.trainerId));

    const fields = [];
    const values = [];
    let i = 1;
    if (data.studentId !== undefined) { fields.push(`"studentId" = $${i++}`); values.push(data.studentId); }
    if (data.company !== undefined) { fields.push(`company = $${i++}`); values.push(data.company); }
    if (data.round !== undefined) { fields.push(`round = $${i++}`); values.push(data.round); }
    if (data.date !== undefined) { fields.push(`date = $${i++}`); values.push(data.date); }
    if (data.timeSlot !== undefined) { fields.push(`"timeSlot" = $${i++}`); values.push(data.timeSlot); }
    if (data.hrNumber !== undefined) { fields.push(`"hrNumber" = $${i++}`); values.push(data.hrNumber); }
    if (data.room !== undefined) { fields.push(`room = $${i++}`); values.push(data.room); }
    if (data.comments !== undefined) { fields.push(`comments = $${i++}`); values.push(data.comments); }
    if (data.status !== undefined) { fields.push(`status = $${i++}`); values.push(data.status); }

    const hadScalarUpdates = fields.length > 0;
    if (hadScalarUpdates) {
      fields.push(`"updatedAt" = now()`);
      values.push(id);
      await query(`UPDATE "Interview" SET ${fields.join(', ')} WHERE id = $${i}`, values);
    }

    let addedTrainerIds = [];
    if (Array.isArray(data.trainerIds)) {
      await query('DELETE FROM "InterviewTrainer" WHERE "interviewId" = $1', [id]);
      for (const trainerId of data.trainerIds) {
        await query(
          'INSERT INTO "InterviewTrainer" ("interviewId", "trainerId", "notifiedAt") VALUES ($1, $2, now()) ON CONFLICT DO NOTHING',
          [id, trainerId]
        );
      }
      addedTrainerIds = data.trainerIds.filter((tid) => !prevTrainerSet.has(tid));
      if (!hadScalarUpdates) {
        await query('UPDATE "Interview" SET "updatedAt" = now() WHERE id = $1', [id]);
      }
    }

    if (!hadScalarUpdates && !Array.isArray(data.trainerIds)) {
      return success(res, before);
    }

    const afterIv = await query(
      `SELECT i.*, s.name as "studentName", s.email as "studentEmail" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1`,
      [id]
    );
    const after = afterIv.rows[0];
    const interviewData = {
      studentName: after.studentName,
      company: after.company,
      round: after.round,
      date: after.date?.toISOString?.() || after.date,
      timeSlot: after.timeSlot,
      hrNumber: after.hrNumber,
      room: after.room,
    };

    if (addedTrainerIds.length) {
      await notifyTrainersForInterview(id, addedTrainerIds, interviewData);
    }

    const dateChanged =
      data.date !== undefined &&
      new Date(data.date).getTime() !== new Date(before.date).getTime();
    const slotChanged =
      data.timeSlot !== undefined && String(data.timeSlot).trim() !== String(before.timeSlot || '').trim();
    const studentEmail = after?.studentEmail && String(after.studentEmail).trim();

    if (dateChanged || slotChanged) {
      await query('DELETE FROM "Notification" WHERE "interviewId" = $1 AND type = $2', [id, 'INTERVIEW_30MIN_REMINDER']);
      const trNow = await query('SELECT "trainerId" FROM "InterviewTrainer" WHERE "interviewId" = $1', [id]);
      const allTrainerIds = trNow.rows.map((r) => r.trainerId);
      if (allTrainerIds.length) {
        await notifyTrainersInterviewScheduleUpdated(id, allTrainerIds, interviewData);
      }
      if (studentEmail) {
        await sendStudentInterviewRescheduled(studentEmail, after.studentName, interviewData);
      }
    }

    const statusChangedToRescheduled =
      data.status !== undefined &&
      String(after.status) === 'RESCHEDULED' &&
      String(before.status) !== 'RESCHEDULED';
    if (statusChangedToRescheduled && !dateChanged && !slotChanged) {
      await query('DELETE FROM "Notification" WHERE "interviewId" = $1 AND type = $2', [id, 'INTERVIEW_30MIN_REMINDER']);
      const trResched = await query('SELECT "trainerId" FROM "InterviewTrainer" WHERE "interviewId" = $1', [id]);
      const reschedTrainerIds = trResched.rows.map((r) => r.trainerId);
      if (reschedTrainerIds.length) {
        await notifyTrainersInterviewScheduleUpdated(id, reschedTrainerIds, interviewData);
      }
      if (studentEmail) {
        await sendStudentInterviewRescheduled(studentEmail, after.studentName, interviewData);
      }
    }

    const ir = await query('SELECT * FROM "Interview" WHERE id = $1', [id]);
    const interview = ir.rows[0];
    if (interview) {
      const s = await query('SELECT * FROM "Student" WHERE id = $1', [interview.studentId]);
      const tr = await query('SELECT * FROM "InterviewTrainer" WHERE "interviewId" = $1', [id]);
      emitInterviewUpdated({ ...interview, student: s.rows[0], trainers: tr.rows });
    }
    return success(res, interview);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.validated;
    await query('DELETE FROM "Interview" WHERE id = $1', [id]);
    return success(res, null, 'Interview deleted');
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { id, status } = req.validated;
    const beforeIv = await query(
      'SELECT i.*, s.name as "studentName", s.email as "studentEmail" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1',
      [id]
    );
    const before = beforeIv.rows[0];
    if (!before) throw new AppError('Interview not found', 404);

    await query('UPDATE "Interview" SET status = $1, "updatedAt" = now() WHERE id = $2', [status, id]);
    const i = await query(
      'SELECT i.*, s.name as "studentName", s.email as "studentEmail" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1',
      [id]
    );
    const interview = i.rows[0];
    const studentEmail =
      interview?.studentEmail && String(interview.studentEmail).trim();
    const studentName = interview?.studentName;
    const becameRescheduled =
      String(status) === 'RESCHEDULED' && String(before.status) !== 'RESCHEDULED';
    const interviewData = interview
      ? {
          studentName,
          company: interview.company,
          round: interview.round,
          date: interview.date?.toISOString?.() || interview.date,
          timeSlot: interview.timeSlot,
          hrNumber: interview.hrNumber,
          room: interview.room,
        }
      : null;

    if (studentEmail && becameRescheduled && interviewData) {
      await sendStudentInterviewRescheduled(studentEmail, studentName, interviewData);
    } else if (studentEmail && interview) {
      await sendStatusUpdate(studentEmail, studentName, interview.company, status);
    }

    if (becameRescheduled && interview) {
      await query('DELETE FROM "Notification" WHERE "interviewId" = $1 AND type = $2', [id, 'INTERVIEW_30MIN_REMINDER']);
      const trRows = await query('SELECT "trainerId" FROM "InterviewTrainer" WHERE "interviewId" = $1', [id]);
      const tids = trRows.rows.map((r) => r.trainerId);
      if (tids.length && interviewData) {
        await notifyTrainersInterviewScheduleUpdated(id, tids, interviewData);
      }
    }

    const payload = interview
      ? { ...interview, name: studentName, email: studentEmail }
      : null;
    if (payload) emitInterviewUpdated(payload);
    return success(res, payload);
  } catch (err) {
    next(err);
  }
}

export async function addTrainers(req, res, next) {
  try {
    const { id, trainerIds } = req.validated;
    const i = await query('SELECT i.*, s.name FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.id = $1', [id]);
    const interview = i.rows[0];
    if (!interview) throw new AppError('Interview not found', 404);
    for (const trainerId of trainerIds) {
      await query('INSERT INTO "InterviewTrainer" ("interviewId", "trainerId", "notifiedAt") VALUES ($1, $2, now()) ON CONFLICT DO NOTHING', [id, trainerId]);
    }
    await notifyTrainersForInterview(id, trainerIds, {
      studentName: interview.name,
      company: interview.company,
      round: interview.round,
      date: interview.date,
      timeSlot: interview.timeSlot,
      hrNumber: interview.hrNumber,
      room: interview.room,
    });
    const ir = await query('SELECT * FROM "Interview" WHERE id = $1', [id]);
    const tr = await query('SELECT it.*, u.id as "u_id", u.name FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = $1', [id]);
    const updated = { ...ir.rows[0], student: { name: interview.name }, trainers: tr.rows.map((r) => ({ trainer: { id: r.u_id, name: r.name } })) };
    emitInterviewUpdated(updated);
    return success(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function removeTrainer(req, res, next) {
  try {
    const { id, trainerId } = req.validated;
    await query('DELETE FROM "InterviewTrainer" WHERE "interviewId" = $1 AND "trainerId" = $2', [id, trainerId]);
    return success(res, null, 'Trainer removed');
  } catch (err) {
    next(err);
  }
}
