/**
 * Send one dummy student interview-finish link email (SMTP test).
 * Usage (from backend):
 *   node scripts/send-dummy-finish-link.js
 *   node scripts/send-dummy-finish-link.js you@example.com
 */
import '../src/loadEnv.js';
import { sendStudentInterviewFinishLink } from '../src/services/email.service.js';
import { getPublicFrontendUrl } from '../src/utils/frontendUrl.utils.js';
import { getSmtpHealth } from '../src/config/nodemailer.js';

const to =
  (process.argv[2] || '').trim() ||
  (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();

if (!to) {
  console.error('No recipient. Pass an email: node scripts/send-dummy-finish-link.js you@example.com');
  process.exit(1);
}

const health = await getSmtpHealth();
if (!health?.configured) {
  console.error('SMTP not configured. Check SMTP_* in backend/.env');
  console.error(health);
  process.exit(1);
}

const company = 'Dummy Corp';
const base = getPublicFrontendUrl().replace(/\/$/, '');
const qs = `email=${encodeURIComponent(to)}&company=${encodeURIComponent(company)}`;
const finishUrl = `${base}/interview/finish?${qs}`;
const questionsUrl = `${base}/interview/questions?${qs}`;

console.log('Sending dummy finish-link mail…');
console.log('  to:', to);
console.log('  finishUrl:', finishUrl);
console.log('  questionsUrl:', questionsUrl);
console.log('  smtp:', health.host, health.user, 'verified=', health.verified);

const info = await sendStudentInterviewFinishLink(to, 'Test Student', {
  company,
  round: 'L1',
  dateLabel: new Date().toLocaleString('en-IN', {
    timeZone: process.env.INTERVIEW_SCHEDULE_TZ || 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
  timeSlot: '10:00 AM – 11:00 AM',
  finishUrl,
  questionsUrl,
});

if (!info) {
  console.error('FAILED — SMTP did not accept the message. Fix SMTP_USER / SMTP_PASS (Gmail App Password) in .env');
  if (health.verifyError) console.error('  verifyError:', health.verifyError);
  process.exit(1);
}

console.log('OK — check inbox (and spam) for:', to);
process.exit(0);
