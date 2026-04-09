import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { notifyTrainersForInterview } from './notification.service.js';
import { emitNewInterview } from './socket.service.js';

/**
 * Creates an Interview row + optional trainer links. Used by admin/trainer API and self-submit approve flow.
 * @param {boolean} [broadcastEmailToAllTrainersIfUnassigned=false] — If true and trainerIds is empty, still email/push/notify every TRAINER (assignment rows stay empty). Used when approving student self-submits without picking trainers.
 */
export async function createInterviewWithTrainers({
  studentId,
  company,
  round,
  date,
  timeSlot,
  hrNumber,
  room,
  comments,
  trainerIds = [],
  broadcastEmailToAllTrainersIfUnassigned = false,
}) {
  const s = await query('SELECT * FROM "Student" WHERE id = $1', [studentId]);
  const student = s.rows[0];
  if (!student) throw new AppError('Student not found', 404);
  const r = await query(
    `INSERT INTO "Interview" ("studentId", company, round, date, "timeSlot", "hrNumber", room, comments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [studentId, company, round, date, timeSlot, hrNumber || null, room || null, comments || null]
  );
  const interview = r.rows[0];
  const ids = trainerIds || [];
  for (const trainerId of ids) {
    await query(
      'INSERT INTO "InterviewTrainer" ("interviewId", "trainerId", "notifiedAt") VALUES ($1, $2, now()) ON CONFLICT DO NOTHING',
      [interview.id, trainerId]
    );
  }
  const interviewData = {
    studentName: student.name,
    company: interview.company,
    round: interview.round,
    date: interview.date?.toISOString?.() || interview.date,
    timeSlot: interview.timeSlot,
    hrNumber: interview.hrNumber,
    room: interview.room,
  };

  let notifyTrainerIds = ids;
  if (!notifyTrainerIds.length && broadcastEmailToAllTrainersIfUnassigned) {
    const allT = await query(`SELECT id FROM "User" WHERE role IN ('TRAINER', 'ADMIN')`);
    notifyTrainerIds = allT.rows.map((row) => row.id);
  }
  // Run notifications in background - don't block the API response
  notifyTrainersForInterview(interview.id, notifyTrainerIds, interviewData).catch((e) =>
    console.error('[notify] Background notification failed:', e)
  );
  emitNewInterview({ ...interview, student, trainers: ids.map((tid) => ({ trainerId: tid })) });
  return { interview, student, trainerIds: ids };
}
