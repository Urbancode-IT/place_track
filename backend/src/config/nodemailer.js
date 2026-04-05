import nodemailer from 'nodemailer';

function trimEnv(key) {
  let v = process.env[key];
  if (v === undefined || v === null || String(v).trim() === '') return null;
  v = String(v).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

const host = trimEnv('SMTP_HOST') || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT) || 587;
const user = trimEnv('SMTP_USER');
const pass = trimEnv('SMTP_PASS');

/** For /health + logs */
export let smtpConfigured = !!(user && pass);
export let smtpVerified = false;
export let smtpVerifyError = null;

if (!user || !pass) {
  console.warn(
    '[mail] SMTP_USER / SMTP_PASS missing in backend/.env — no emails will be sent until you set them.'
  );
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: {
    user: user || '',
    pass: pass || '',
  },
  tls: {
    servername: host,
  },
});

/** Default From: Gmail often rejects if From domain does not match SMTP_USER */
export function getDefaultMailFrom() {
  const fromEnv = trimEnv('SMTP_FROM');
  if (fromEnv) return fromEnv;
  if (user) return `PlaceTrack <${user}>`;
  return 'PlaceTrack <noreply@localhost>';
}

if (smtpConfigured) {
  transporter
    .verify()
    .then(() => {
      smtpVerified = true;
      smtpVerifyError = null;
      console.log(`[mail] SMTP OK — connected to ${host}:${port} as ${user}`);
    })
    .catch((e) => {
      smtpVerified = false;
      smtpVerifyError = e?.message || String(e);
      console.error('[mail] SMTP verify FAILED:', smtpVerifyError);
      console.error('[mail] Gmail: use an App Password (2FA), not your normal password. Match SMTP_FROM to SMTP_USER.');
    });
}

export function getSmtpHealth() {
  return {
    configured: smtpConfigured,
    verified: smtpVerified,
    verifyError: smtpVerifyError,
    host,
    port,
    user: user ? `${user.slice(0, 2)}***` : null,
  };
}

/**
 * Sends mail or logs why it was skipped/failed (check backend terminal + GET /health → mail).
 */
export async function sendMailSafe(options) {
  if (!user || !pass) {
    console.warn(
      `[mail] skipped — set SMTP_USER & SMTP_PASS in placetrack/backend/.env (to=${options?.to}, subject=${options?.subject})`
    );
    return null;
  }
  try {
    const info = await transporter.sendMail(options);
    console.log('[mail] sent →', options.to, '·', options.subject, info?.messageId ? `(${info.messageId})` : '');
    return info;
  } catch (e) {
    console.error('[mail] send FAILED →', options?.to, '·', e?.message || e);
    return null;
  }
}

export default transporter;
