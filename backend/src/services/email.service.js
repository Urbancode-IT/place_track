import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDefaultMailFrom, sendMailSafe } from '../config/nodemailer.js';

function formatDateForMail(d) {
  if (d == null) return '';
  try {
    const x = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(x.getTime())) return String(d);
    return x.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
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
    subject: `PlaceTrack: Interview time updated — ${data.company} — ${data.studentName}`,
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
    subject: `PlaceTrack: Interview scheduled - ${data.company} - ${data.studentName}`,
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
    subject: `PlaceTrack: You are assigned - ${data.company}`,
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
    subject: `PlaceTrack: Interview status - ${company}`,
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
    subject: `PlaceTrack: Interview rescheduled — ${data.company}`,
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
    subject: `PlaceTrack: Interview in 30 min — ${data.company} / ${data.studentName}`,
    html: body,
  });
}

export async function sendDailySummary(toEmail, htmlContent) {
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: 'PlaceTrack: Tomorrow\'s interview schedule',
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

function taskMailHtml(toName, { taskTitle, deadline, message, heading }) {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>${heading}</h2>
    <p>Hello ${toName || 'Trainer'},</p>
    <p>${message}</p>
    <ul>
      <li><strong>Task</strong>: ${taskTitle}</li>
      <li><strong>Deadline</strong>: ${deadline}</li>
    </ul>
    <p>Regards,<br/>PlaceTrack</p>
  </div>`;
}

export async function sendTaskNotificationEmail(toEmail, toName, data) {
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `PlaceTrack: New Task Assigned - ${data.taskTitle}`,
    html: taskMailHtml(toName, { ...data, heading: 'New Task Assigned' }),
  });
}

export async function sendTaskDeadlineReminderEmail(toEmail, toName, data) {
  await sendMailSafe({
    from: getDefaultMailFrom(),
    to: toEmail,
    subject: `PlaceTrack: Deadline Reminder - ${data.taskTitle}`,
    html: taskMailHtml(toName, { ...data, heading: 'Task Deadline Reminder' }),
  });
}
