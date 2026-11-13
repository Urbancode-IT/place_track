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
// Gmail App Passwords are often pasted with spaces — strip them for SMTP auth
const pass = trimEnv('SMTP_PASS')?.replace(/\s+/g, '') || null;

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
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
  auth: {
    user: user || '',
    pass: pass || '',
  },
  tls: {
    servername: host,
  },
});

/**
 * Strip tags for multipart/alternative plain text (HTML-only mail is a common spam signal).
 */
export function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Default From header.
 * Prefer SMTP_FROM when set (e.g. PlaceTrack <admin@urbancode.in>).
 * If SMTP_FROM is only a display name, pair it with SMTP_USER.
 * Alias From (≠ SMTP_USER) needs Gmail/Workspace “Send mail as” or same-account login — else spam/reject.
 */
export function getDefaultMailFrom() {
  if (!user) return 'PlaceTrack <noreply@localhost>';

  const fromEnv = trimEnv('SMTP_FROM');
  if (!fromEnv) return `PlaceTrack <${user}>`;

  const angled = fromEnv.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (angled) {
    const display = angled[1].trim().replace(/^["']|["']$/g, '') || 'PlaceTrack';
    const addr = angled[2].trim();
    if (addr.toLowerCase() !== user.toLowerCase()) {
      console.warn(
        `[mail] From ${addr} ≠ SMTP_USER ${user} — ensure Send mail as / Workspace allows this alias`
      );
    }
    return `${display} <${addr}>`;
  }

  if (fromEnv.includes('@')) {
    if (fromEnv.toLowerCase() !== user.toLowerCase()) {
      console.warn(
        `[mail] From ${fromEnv} ≠ SMTP_USER ${user} — ensure Send mail as / Workspace allows this alias`
      );
    }
    return fromEnv;
  }

  return `${fromEnv} <${user}>`;
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
      console.error(
        '[mail] Gmail: use an App Password (2FA), not your normal password. SMTP_FROM must use the same address as SMTP_USER.'
      );
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
    from: getDefaultMailFrom(),
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
    const from = options.from || getDefaultMailFrom();
    const payload = {
      ...options,
      from,
      replyTo: options.replyTo || user,
      // Envelope MAIL FROM must match authenticated Gmail user
      envelope: options.envelope || {
        from: user,
        to: options.to,
      },
      headers: {
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        ...(options.headers || {}),
      },
    };
    if (payload.html && !payload.text) {
      payload.text = htmlToPlainText(payload.html);
    }

    const info = await transporter.sendMail(payload);
    console.log('[mail] sent →', options.to, '·', options.subject, info?.messageId ? `(${info.messageId})` : '');
    return info;
  } catch (e) {
    console.error('[mail] send FAILED →', options?.to, '·', e?.message || e);
    return null;
  }
}

export default transporter;
