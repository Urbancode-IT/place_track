import { query } from '../config/db.js';
import { sendInterviewScheduled, sendInterviewScheduleUpdated } from './email.service.js';
import { getIO } from '../config/socket.js';
import { sendPushToUsers } from './push.service.js';

export async function notifyTrainersForInterview(interviewId, trainerIds, interviewData) {
  if (!trainerIds?.length) return;
  /** TRAINER + ADMIN: admins linked to an interview still get mail (role filter was excluding valid users). */
  const r = await query(
    `SELECT id, name, email FROM "User" WHERE id = ANY($1::text[]) AND role IN ('TRAINER', 'ADMIN')`,
    [trainerIds]
  );
  const trainers = r.rows;
  if (!trainers.length) {
    if (trainerIds?.length) {
      console.warn(
        `[mail] notifyTrainersForInterview: no User rows for interview ${interviewId} (ids=${trainerIds.length}). Check ids exist and role is TRAINER or ADMIN.`
      );
    }
    return;
  }

  const emailPromises = [];
  const dbPromises = [];
  let emailAttemptCount = 0;

  for (const t of trainers) {
    const data = {
      studentName: interviewData.studentName,
      company: interviewData.company,
      round: interviewData.round,
      date: interviewData.date,
      timeSlot: interviewData.timeSlot,
      hrNumber: interviewData.hrNumber,
      room: interviewData.room,
    };
    const em = t.email && String(t.email).trim();
    if (em) {
      emailAttemptCount += 1;
      emailPromises.push(sendInterviewScheduled(em, t.name, data).catch((e) => console.error('Email error:', e)));
    } else {
      console.warn(`[mail] notifyTrainersForInterview: user "${t.name}" (${t.id}) has no email — SMTP send skipped`);
    }
    dbPromises.push(
      query(
        `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['INTERVIEW_ASSIGNED', `Interview scheduled: ${interviewData.studentName} - ${interviewData.company}`, 'EMAIL', t.id, interviewId, 'SENT']
      )
    );
  }

  // Run all email sends and DB inserts in parallel
  await Promise.all([...emailPromises, ...dbPromises]);

  if (trainers.length && emailAttemptCount === 0) {
    console.warn(
      `[mail] notifyTrainersForInterview: interview ${interviewId} — ${trainers.length} recipient(s) but none have an email in the database`
    );
  }

  // Push (best-effort)
  await sendPushToUsers(
    trainers.map((t) => t.id),
    {
      title: 'New Interview Assigned',
      body: `${interviewData.studentName} - ${interviewData.company} (${interviewData.round})`,
      link: process.env.FRONTEND_URL || 'http://localhost:5173',
      data: { type: 'INTERVIEW_ASSIGNED', interviewId: String(interviewId) },
    }
  ).catch(() => {});

  const pushDbPromises = trainers.map((t) =>
    query(
      `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['INTERVIEW_ASSIGNED', `Interview scheduled: ${interviewData.studentName} - ${interviewData.company}`, 'PUSH', t.id, interviewId, 'SENT']
    )
  );
  await Promise.all(pushDbPromises);

  const io = getIO();
  for (const t of trainers) {
    io.to(`user:${t.id}`).emit('interview:assigned', { interviewId, ...interviewData });
  }
}

/** Email only — when interview date/time changes (or marked rescheduled) so trainers see the new slot */
export async function notifyTrainersInterviewScheduleUpdated(interviewId, trainerIds, interviewData) {
  if (!trainerIds?.length) return;
  const r = await query(
    `SELECT id, name, email FROM "User" WHERE id = ANY($1::text[]) AND role IN ('TRAINER', 'ADMIN')`,
    [trainerIds]
  );
  const withEmail = r.rows.filter((t) => t.email && String(t.email).trim());
  if (!withEmail.length) {
    console.warn(
      `[mail] notifyTrainersInterviewScheduleUpdated: no trainer with email for interview ${interviewId} (${r.rows.length} row(s) in DB)`
    );
    return;
  }
  await Promise.all(
    withEmail.map((t) =>
      sendInterviewScheduleUpdated(t.email, t.name, interviewData).catch((e) =>
        console.error('[mail] schedule-updated failed', t.email, e?.message || e)
      )
    )
  );
}

export async function createNotification(data) {
  const r = await query(
    `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.type, data.message, data.channel, data.toUserId || null, data.interviewId || null, data.status || 'SENT']
  );
  return r.rows[0];
}
