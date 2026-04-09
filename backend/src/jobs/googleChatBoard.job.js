import cron from 'node-cron';
import { query } from '../config/db.js';
import { sendToGoogleChat } from '../services/googleChat.service.js';

/**
 * Runs at 10:00 AM daily to post Today's Live Interview Board to Google Chat.
 */
export function runGoogleChatBoardJob() {
  // Cron expression: 0 10 * * * (At 10:00:00 AM every day)
  cron.schedule('0 10 * * *', async () => {
    console.log('[cron] Running Google Chat Board Job at 10:00 AM');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Fetch today's interviews
      const r = await query(
        `SELECT i.*, s.name as "studentName", s.course
         FROM "Interview" i
         JOIN "Student" s ON s.id = i."studentId"
         WHERE i.date >= $1 AND i.date < $2
         ORDER BY i."timeSlot" ASC`,
        [today, tomorrow]
      );

      const interviews = r.rows;

      if (interviews.length === 0) {
        await sendToGoogleChat('*Today\'s Live Interview Board*\nNo interviews scheduled for today.');
        return;
      }

      // Format message
      let message = `*Today's Live Interview Board (${today.toLocaleDateString('en-IN')})*\n\n`;
      
      for (const i of interviews) {
        // Fetch trainers for this interview
        const tr = await query(
          `SELECT u.name FROM "InterviewTrainer" it
           JOIN "User" u ON u.id = it."trainerId"
           WHERE it."interviewId" = $1`,
          [i.id]
        );
        const trainerNames = tr.rows.map(t => t.name).join(', ') || 'Unassigned';

        message += `• *${i.timeSlot}*: ${i.studentName} (${i.course}) - ${i.company}\n`;
        message += `  _Round:_ ${i.round}\n`;
        message += `  _Trainers:_ ${trainerNames}\n`;
        if (i.room) message += `  _Room/Link:_ ${i.room}\n`;
        message += `\n`;
      }

      message += `View more on PlaceTrack: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

      await sendToGoogleChat(message);
      console.log('[cron] Today\'s board posted to Google Chat');
    } catch (err) {
      console.error('[cron] Google Chat Board Job failed:', err.message);
    }
  });
}
