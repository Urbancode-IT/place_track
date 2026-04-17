import cron from 'node-cron';
import { query } from '../config/db.js';
import { sendToGoogleChat } from '../services/googleChat.service.js';

/**
 * Runs at 10:00 PM daily to post the next day's interview board to Google Chat.
 */
export function runGoogleChatBoardJob() {
  // Cron expression: 0 22 * * * (At 10:00:00 PM every day)
  cron.schedule('0 22 * * *', async () => {
    console.log('[cron] Running Google Chat Board Job at 10:00 PM for next day interviews');

    try {
      const now = new Date();
      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(now.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      const dayAfterStart = new Date(tomorrowStart);
      dayAfterStart.setDate(tomorrowStart.getDate() + 1);

      const approvedResult = await query(
        `SELECT i.*, s.name as "studentName", s.course
         FROM "Interview" i
         JOIN "Student" s ON s.id = i."studentId"
         WHERE i.date >= $1 AND i.date < $2
         ORDER BY i."timeSlot" ASC`,
        [tomorrowStart, dayAfterStart]
      );

      const pendingResult = await query(
        `SELECT r.id, r.company, r.round, r.date, r."timeSlot", r.room,
                s.name as "studentName", s.course
         FROM "StudentInterviewRequest" r
         JOIN "Student" s ON s.id = r."studentId"
         WHERE r.status = 'SUBMITTED'
           AND r.date >= $1 AND r.date < $2
         ORDER BY r."timeSlot" ASC, r."submittedAt" ASC`,
        [tomorrowStart, dayAfterStart]
      );

      const interviews = approvedResult.rows;
      const pendingRequests = pendingResult.rows;

      if (interviews.length === 0 && pendingRequests.length === 0) {
        await sendToGoogleChat(
          `*Tomorrow's Live Interview Board (${tomorrowStart.toLocaleDateString('en-IN')})*\nNo interviews scheduled for tomorrow.`
        );
        return;
      }

      let message = `*Tomorrow's Live Interview Board (${tomorrowStart.toLocaleDateString('en-IN')})*\n\n`;

      if (interviews.length) {
        message += '*Approved Interviews*\n';

        for (const interview of interviews) {
          const tr = await query(
            `SELECT u.name FROM "InterviewTrainer" it
             JOIN "User" u ON u.id = it."trainerId"
             WHERE it."interviewId" = $1`,
            [interview.id]
          );
          const trainerNames = tr.rows.map((t) => t.name).join(', ') || 'Unassigned';

          message += `• *${interview.timeSlot}*: ${interview.studentName} (${interview.course}) - ${interview.company}\n`;
          message += `  _Round:_ ${interview.round}\n`;
          message += `  _Trainers:_ ${trainerNames}\n`;
          if (interview.room) message += `  _Room/Link:_ ${interview.room}\n`;
          message += '\n';
        }
      }

      if (pendingRequests.length) {
        message += '*Approval Pending*\n';

        for (const request of pendingRequests) {
          message += `• *${request.timeSlot}*: ${request.studentName} (${request.course}) - ${request.company}\n`;
          message += `  _Round:_ ${request.round}\n`;
          message += '  _Status:_ Approval Pending\n';
          if (request.room) message += `  _Room/Link:_ ${request.room}\n`;
          message += '\n';
        }
      }

      message += `View more on PlaceTrack: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

      await sendToGoogleChat(message);
      console.log('[cron] Tomorrow\'s board posted to Google Chat');
    } catch (err) {
      console.error('[cron] Google Chat Board Job failed:', err.message);
    }
  });
}
