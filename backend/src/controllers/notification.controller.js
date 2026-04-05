import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  sendTaskNotificationEmail,
  sendTaskDeadlineReminderEmail,
  sendInterviewScheduled,
} from '../services/email.service.js';
import { sendPushToUsers } from '../services/push.service.js';

export async function list(req, res, next) {
  try {
    const { type, channel, limit = 50 } = req.query;
    const conds = ['"toUserId" = $1'];
    const vals = [req.user.id];
    let idx = 2;
    if (type) { conds.push(`type = $${idx++}`); vals.push(type); }
    if (channel) { conds.push(`channel = $${idx++}`); vals.push(channel); }
    const limitVal = Math.min(Number(limit) || 50, 100);
    const r = await query(
      `SELECT n.*, i.id as "i_id", i.company as "i_company", i.date as "i_date" FROM "Notification" n
       LEFT JOIN "Interview" i ON i.id = n."interviewId" WHERE ${conds.join(' AND ')} ORDER BY n."sentAt" DESC LIMIT $${idx}`,
      [...vals, limitVal]
    );
    const notifications = r.rows.map((n) => ({
      ...n,
      interview: n.i_id ? { id: n.i_id, company: n.i_company, date: n.i_date } : null,
    }));
    const countR = await query(
      `SELECT COUNT(*)::int as total FROM "Notification" WHERE "toUserId" = $1 AND read = false`,
      [req.user.id]
    );
    const unreadCount = countR.rows[0]?.total || 0;
    return success(res, { notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function readAll(req, res, next) {
  try {
    await query('UPDATE "Notification" SET read = true WHERE "toUserId" = $1', [req.user.id]);
    return success(res, null, 'Marked all as read');
  } catch (err) {
    next(err);
  }
}

const defaultSettings = { email: true, push: true };

export async function getSettings(req, res, next) {
  try {
    return success(res, defaultSettings);
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { email, push } = req.body || {};
    const settings = {
      ...defaultSettings,
      ...(typeof email === 'boolean' && { email }),
      ...(typeof push === 'boolean' && { push }),
    };
    return success(res, settings);
  } catch (err) {
    next(err);
  }
}

export async function trigger(req, res, next) {
  try {
    const {
      userIds = [],
      title,
      message,
      taskTitle,
      deadline,
      type = 'CUSTOM_NOTIFICATION',
      interviewId = null,
      link = process.env.FRONTEND_URL || 'http://localhost:5173',
      isDeadlineReminder = false,
    } = req.body || {};

    if (!Array.isArray(userIds) || userIds.length === 0) throw new AppError('userIds required', 400);
    if (!title || !message || !taskTitle || !deadline) {
      throw new AppError('title, message, taskTitle and deadline are required', 400);
    }

    const usersR = await query(
      `SELECT id, name, email FROM "User" WHERE id = ANY($1) AND role = $2`,
      [userIds, 'TRAINER']
    );
    const trainers = usersR.rows;
    if (!trainers.length) throw new AppError('No trainers found for provided userIds', 404);

    const emailPromises = trainers
      .filter((u) => !!u.email)
      .map((u) => {
        if (isDeadlineReminder) {
          return sendTaskDeadlineReminderEmail(u.email, u.name, { taskTitle, deadline, message });
        }
        return sendTaskNotificationEmail(u.email, u.name, { taskTitle, deadline, message });
      });
    await Promise.all(emailPromises.map((p) => p.catch(() => {})));

    await sendPushToUsers(
      trainers.map((t) => t.id),
      {
        title,
        body: message,
        link,
        data: {
          type,
          taskTitle: String(taskTitle),
          deadline: String(deadline),
          ...(interviewId ? { interviewId: String(interviewId) } : {}),
        },
      }
    ).catch(() => {});

    for (const t of trainers) {
      await query(
        `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [type, message, 'EMAIL', t.id, interviewId, 'SENT']
      );
      await query(
        `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [type, message, 'PUSH', t.id, interviewId, 'SENT']
      );
    }

    return success(res, { totalTrainers: trainers.length }, 'Notifications sent');
  } catch (err) {
    next(err);
  }
}

/** Admin: send one “interview scheduled” test mail (SMTP must be configured). */
export async function testInterviewEmail(req, res, next) {
  try {
    const v = req.validated;
    const studentName = v.studentName ?? 'Siva Sankara Pandian';
    const company = v.company ?? 'Tech Mahindra';
    const round = v.round ?? 'FSD';
    const date = v.date ?? new Date().toISOString().slice(0, 10);
    const timeSlot = v.timeSlot ?? '10:00 AM – 11:00 AM';
    const hrNumber = v.hrNumber ?? 'N/A';
    const room = v.room ?? 'N/A';

    const usersR = await query(
      `SELECT id, name, email FROM "User" WHERE id = ANY($1) AND role = $2`,
      [v.trainerIds, 'TRAINER']
    );
    const trainers = usersR.rows.filter((t) => t.email && String(t.email).trim());
    if (!trainers.length) {
      throw new AppError('No trainers with email for provided trainerIds', 404);
    }

    const data = { studentName, company, round, date, timeSlot, hrNumber, room };
    const results = await Promise.all(
      trainers.map(async (t) => {
        const info = await sendInterviewScheduled(t.email, t.name, data);
        return { trainerId: t.id, email: t.email, sent: !!info };
      })
    );

    return success(
      res,
      { results, note: 'Dummy / test content — subject still says PlaceTrack: Interview scheduled' },
      'Test interview emails queued'
    );
  } catch (err) {
    next(err);
  }
}
