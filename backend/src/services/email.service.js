import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDefaultMailFrom, sendMailSafe } from '../config/nodemailer.js';

/** Calendar date only (timeSlot is shown separately — avoid “12:00 am” noise). */
function formatDateForMail(d) {
  if (d == null) return '';
  try {
    const x = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(x.getTime())) return String(d);
    return x.toLocaleDateString('en-IN', {
      timeZone: process.env.INTERVIEW_SCHEDULE_TZ || 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTemplate(name) {
  try {
    return readFileSync(path.join(__dirname, '../templates/email', name), 'utf-8');
  } catch {
    return '';
  }
}

function replaceVars(html, vars) {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{${k}}}`, 'g'), v ?? '');
  }
  return out;
}

/** After date/time change on an existing interview */
export async function sendInterviewScheduleUpdated(toEmail, toName, data) {
  const html = loadTemplate('interview-updated.html');
  const dateLabel = formatDateForMail(data.date);
  const body = replaceVars(
    html ||
      '<p>{{trainerName}} — {{company}} / {{studentName}} updated: {{date}} {{timeSlot}}</p>',
    {
      trainerName: toName,
      studentName: data.studentName,
      company: data.company,
      round: data.round,
      date: dateLabel || String(data.date ?? ''),
      timeSlot: data.timeSlot,
      hrNumber: data.hrNumber || 'N/A',
      room: data.room || 'N/A',
    }
  );
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Interview time updated: ${data.company} / ${data.studentName}`,
    html: body,
  });
}

export async function sendInterviewScheduled(toEmail, toName, data) {
  const html = loadTemplate('interview-scheduled.html');
  const dateLabel = formatDateForMail(data.date);
  const body = replaceVars(html, {
    trainerName: toName,
    studentName: data.studentName,
    company: data.company,
    round: data.round,
    date: dateLabel || String(data.date ?? ''),
    timeSlot: data.timeSlot,
    hrNumber: data.hrNumber || 'N/A',
    room: data.room || 'N/A',
  });
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Interview scheduled: ${data.company} / ${data.studentName}`,
    html: body,
  });
}

export async function sendTrainerAssigned(toEmail, toName, data) {
  const html = loadTemplate('trainer-assigned.html');
  const body = replaceVars(html, {
    trainerName: toName,
    studentName: data.studentName,
    company: data.company,
    round: data.round,
    date: data.date,
    timeSlot: data.timeSlot,
  });
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Trainer assigned: ${data.company}`,
    html: body,
  });
}

export async function sendStatusUpdate(toEmail, studentName, company, status) {
  const html = loadTemplate('status-update.html');
  const body = replaceVars(html, {
    studentName,
    company,
    status,
  });
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Interview status: ${company}`,
    html: body,
  });
}

/** Student inbox — rescheduled / new slot (public finish or admin schedule) */
export async function sendStudentInterviewRescheduled(toEmail, studentName, data) {
  const html = loadTemplate('interview-rescheduled-student.html');
  const dateLabel = formatDateForMail(data.date);
  const body = replaceVars(
    html ||
      '<p>Hi {{studentName}}, your {{company}} interview is rescheduled: {{date}} {{timeSlot}}</p>',
    {
      studentName: studentName || 'there',
      company: data.company,
      round: data.round,
      date: dateLabel || String(data.date ?? ''),
      timeSlot: data.timeSlot || '',
      hrNumber: data.hrNumber || 'N/A',
      room: data.room || 'N/A',
    }
  );
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Interview rescheduled: ${data.company}`,
    html: body,
  });
}

/** After interview start — student gets public finish form link (outcome / reschedule) */
export async function sendStudentInterviewFinishLink(toEmail, studentName, data) {
  const html = loadTemplate('interview-finish-student.html');
  const body = replaceVars(
    html ||
      '<p>Hi {{studentName}}, outcome: <a href="{{finishUrl}}">{{finishUrl}}</a> · questions: <a href="{{questionsUrl}}">{{questionsUrl}}</a></p>',
    {
      studentName: studentName || 'there',
      company: data.company || '',
      round: data.round || '—',
      date: data.dateLabel || data.date || '',
      timeSlot: data.timeSlot || '—',
      finishUrl: data.finishUrl || '',
      questionsUrl: data.questionsUrl || '',
    }
  );
  return sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Interview outcome form: ${data.company}`,
    html: body,
  });
}

/** ~2h after first finish-link mail if student still has not submitted */
export async function sendStudentInterviewFinishReminder(toEmail, studentName, data) {
  const html = loadTemplate('interview-finish-reminder-student.html');
  const body = replaceVars(
    html ||
      '<p>Hi {{studentName}}, reminder — update {{company}}: <a href="{{finishUrl}}">{{finishUrl}}</a></p>',
    {
      studentName: studentName || 'there',
      company: data.company || '',
      round: data.round || '—',
      date: data.dateLabel || data.date || '',
      timeSlot: data.timeSlot || '—',
      finishUrl: data.finishUrl || '',
      questionsUrl: data.questionsUrl || '',
    }
  );
  return sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Interview update pending: ${data.company}`,
    html: body,
  });
}

/** ~30 minutes before interview — cron-driven reminder for assigned trainers */
export async function sendInterviewTrainerReminder(toEmail, toName, data) {
  const html = loadTemplate('interview-trainer-reminder.html');
  const body = replaceVars(html || '<p>{{trainerName}} — {{company}} — {{studentName}} at {{timeSlot}}</p>', {
    trainerName: toName,
    studentName: data.studentName,
    company: data.company,
    round: data.round,
    date: data.dateLabel || data.date || '',
    timeSlot: data.timeSlot || '',
    hrNumber: data.hrNumber || 'N/A',
    room: data.room || 'N/A',
  });
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Interview in 30 min: ${data.company} / ${data.studentName}`,
    html: body,
  });
}

export async function sendDailySummary(toEmail, htmlContent) {
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: 'Tomorrow interview schedule',
    html: htmlContent,
  });
}

/** Same digest as Google Chat daily board — one mail per address */
export async function sendTomorrowBoardDigest(toEmails, htmlBody, subject) {
  const list = Array.isArray(toEmails)
    ? toEmails
    : String(toEmails)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  for (const to of list) {
    await sendMailSafe({
      from: getDefaultMailFrom(),
      to,
      subject,
      html: htmlBody,
    });
  }
}

function taskMailHtml(toName, { taskTitle, deadline, message }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0f766e;padding:16px 24px;"><p style="margin:0;color:#fff;font-size:16px;font-weight:700;">PlaceTrack</p></td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 12px;font-size:15px;color:#111827;">Hi ${toName || 'Trainer'},</p>
<p style="margin:0 0 16px;font-size:15px;color:#374151;">${message}</p>
<p style="margin:0;font-size:14px;color:#111827;"><strong>Task:</strong> ${taskTitle}<br><strong>Deadline:</strong> ${deadline}</p>
</td></tr>
<tr><td style="padding:0 24px 20px;"><p style="margin:0;font-size:12px;color:#9ca3af;">Urbancode Placement · PlaceTrack</p></td></tr>
</table></td></tr></table>
</body></html>`;
}

export async function sendTaskNotificationEmail(toEmail, toName, data) {
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `New task: ${data.taskTitle}`,
    html: taskMailHtml(toName, data),
  });
}

export async function sendTaskDeadlineReminderEmail(toEmail, toName, data) {
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `Task deadline: ${data.taskTitle}`,
    html: taskMailHtml(toName, data),
  });
}
