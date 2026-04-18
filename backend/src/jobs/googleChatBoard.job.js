import cron from 'node-cron';
import { query } from '../config/db.js';
import { sendToGoogleChat } from '../services/googleChat.service.js';
import { sendTomorrowBoardDigest } from '../services/email.service.js';

const TZ = process.env.GOOGLE_CHAT_CRON_TZ || process.env.INTERVIEW_SCHEDULE_TZ || 'Asia/Kolkata';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Start of calendar day `daysFromToday` in TZ (default Asia/Kolkata), as a Date instant. */
function dayStartInTz(daysFromToday) {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TZ });
  const [y, m, d] = todayStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + daysFromToday));
  const yy = target.getUTCFullYear();
  const mm = target.getUTCMonth() + 1;
  const dd = target.getUTCDate();
  const offset = process.env.INTERVIEW_SCHEDULE_OFFSET || '+05:30';
  return new Date(`${yy}-${pad2(mm)}-${pad2(dd)}T00:00:00${offset}`);
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getDailyBoardEmailRecipients() {
  const raw = process.env.DAILY_BOARD_EMAIL_TO?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const r = await query(
    `SELECT email FROM "User" WHERE role = 'ADMIN' AND email IS NOT NULL AND trim(email) != ''`
  );
  return r.rows.map((row) => row.email).filter(Boolean);
}

/**
 * Build Chat text + HTML from the same rows (trainers loaded per interview).
 */
async function buildBoardMessages(interviews, pendingRequests, dateLabel, frontendUrl) {
  const footer = `View more on PlaceTrack: ${frontendUrl}`;

  if (interviews.length === 0 && pendingRequests.length === 0) {
    const head = `Tomorrow's Live Interview Board (${dateLabel})`;
    const plain = `*${head}*\nNo interviews scheduled for tomorrow.\n\n${footer}`;
    const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
  <h2 style="margin: 0 0 12px;">${esc(head)}</h2>
  <p>No interviews scheduled for tomorrow.</p>
  <p style="margin-top: 16px;"><a href="${esc(frontendUrl)}">Open PlaceTrack</a></p>
</div>`;
    return { plain, html };
  }

  let plain = `*Tomorrow's Live Interview Board (${dateLabel})*\n\n`;
  let htmlBody = `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
  <h2 style="margin: 0 0 12px;">Tomorrow's Live Interview Board — ${esc(dateLabel)}</h2>`;

  if (interviews.length) {
    plain += '*Approved Interviews*\n';
    htmlBody += '<h3 style="margin: 16px 0 8px; font-size: 15px;">Approved Interviews</h3><ul style="margin: 0; padding-left: 20px;">';

    for (const interview of interviews) {
      const tr = await query(
        `SELECT u.name FROM "InterviewTrainer" it
         JOIN "User" u ON u.id = it."trainerId"
         WHERE it."interviewId" = $1`,
        [interview.id]
      );
      const trainerNames = tr.rows.map((t) => t.name).join(', ') || 'Unassigned';

      plain += `• *${interview.timeSlot}*: ${interview.studentName} (${interview.course}) - ${interview.company}\n`;
      plain += `  _Round:_ ${interview.round}\n`;
      plain += `  _Trainers:_ ${trainerNames}\n`;
      if (interview.room) plain += `  _Room/Link:_ ${interview.room}\n`;
      plain += '\n';

      htmlBody += `<li style="margin-bottom: 12px;"><strong>${esc(interview.timeSlot)}</strong> — ${esc(interview.studentName)} (${esc(interview.course)}) — ${esc(interview.company)}<br/>
        <span style="color: #444;">Round:</span> ${esc(interview.round)}<br/>
        <span style="color: #444;">Trainers:</span> ${esc(trainerNames)}`;
      if (interview.room) {
        htmlBody += `<br/><span style="color: #444;">Room/Link:</span> ${esc(interview.room)}`;
      }
      htmlBody += '</li>';
    }
    htmlBody += '</ul>';
  }

  if (pendingRequests.length) {
    plain += '*Approval Pending*\n';
    htmlBody += '<h3 style="margin: 16px 0 8px; font-size: 15px;">Approval Pending</h3><ul style="margin: 0; padding-left: 20px;">';

    for (const request of pendingRequests) {
      plain += `• *${request.timeSlot}*: ${request.studentName} (${request.course}) - ${request.company}\n`;
      plain += `  _Round:_ ${request.round}\n`;
      plain += '  _Status:_ Approval Pending\n';
      if (request.room) plain += `  _Room/Link:_ ${request.room}\n`;
      plain += '\n';

      htmlBody += `<li style="margin-bottom: 12px;"><strong>${esc(request.timeSlot)}</strong> — ${esc(request.studentName)} (${esc(request.course)}) — ${esc(request.company)}<br/>
        <span style="color: #444;">Round:</span> ${esc(request.round)}<br/>
        <span style="color: #b45309;">Status: Approval Pending</span>`;
      if (request.room) {
        htmlBody += `<br/><span style="color: #444;">Room/Link:</span> ${esc(request.room)}`;
      }
      htmlBody += '</li>';
    }
    htmlBody += '</ul>';
  }

  plain += footer;
  htmlBody += `<p style="margin-top: 16px;"><a href="${esc(frontendUrl)}">${esc(footer)}</a></p></div>`;

  return { plain, html: htmlBody };
}

/**
 * Posts next calendar day (in TZ) interviews to Google Chat and emails digest (admins or DAILY_BOARD_EMAIL_TO).
 */
export async function runGoogleChatBoardOnce() {
  const tomorrowStart = dayStartInTz(1);
  const dayAfterStart = dayStartInTz(2);
  const dateLabel = tomorrowStart.toLocaleDateString('en-IN', { timeZone: TZ });
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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

  const { plain, html } = await buildBoardMessages(interviews, pendingRequests, dateLabel, frontendUrl);

  const chatResult = await sendToGoogleChat(plain);
  if (!chatResult.ok) console.error('[cron] Google Chat send failed:', chatResult.error);

  let mailCount = 0;
  try {
    const recipients = await getDailyBoardEmailRecipients();
    if (recipients.length) {
      await sendTomorrowBoardDigest(
        recipients,
        html,
        `PlaceTrack: Tomorrow's interview board (${dateLabel})`
      );
      mailCount = recipients.length;
      console.log(`[cron] Tomorrow board email queued for ${mailCount} address(es)`);
    }
  } catch (e) {
    console.error('[cron] Tomorrow board email failed:', e?.message || e);
  }

  return { ...chatResult, mailRecipients: mailCount };
}

/**
 * Daily at 10:00 PM in GOOGLE_CHAT_CRON_TZ (default Asia/Kolkata): post next day's board.
 * On hosts that sleep (Render free tier), set GOOGLE_CHAT_DISABLE_INTERNAL_CRON=true and use
 * GET/POST /api/public/cron/google-chat-board with GOOGLE_CHAT_CRON_SECRET from cron-job.org at 22:00 IST.
 */
export function runGoogleChatBoardJob() {
  if (process.env.GOOGLE_CHAT_DISABLE_INTERNAL_CRON === 'true') {
    console.log(
      '[cron] Google Chat: internal cron disabled — use /api/public/cron/google-chat-board + external scheduler'
    );
    return;
  }
  cron.schedule(
    '0 22 * * *',
    async () => {
      console.log(`[cron] Google Chat board job (${TZ}) — next-day interviews`);
      try {
        await runGoogleChatBoardOnce();
        console.log('[cron] Tomorrow\'s board job finished');
      } catch (err) {
        console.error('[cron] Google Chat Board Job failed:', err?.message || err);
      }
    },
    { timezone: TZ }
  );
}
