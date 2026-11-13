import crypto from 'crypto';

const DEFAULT_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

function secret() {
  const s =
    process.env.GOOGLE_CHAT_ACTION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    '';
  if (!s) throw new Error('GOOGLE_CHAT_ACTION_SECRET or JWT_SECRET required for chat actions');
  return s;
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

/**
 * @param {{ kind: 'finish'|'self', id: string, action: 'approve'|'reject', exp?: number }} payload
 */
export function signChatAction(payload, ttlSec = DEFAULT_TTL_SEC) {
  const body = {
    kind: payload.kind,
    id: payload.id,
    action: payload.action,
    exp: payload.exp || Math.floor(Date.now() / 1000) + ttlSec,
  };
  const payloadPart = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', secret()).update(payloadPart).digest();
  return `${payloadPart}.${b64url(sig)}`;
}

/**
 * @returns {{ kind: 'finish'|'self', id: string, action: 'approve'|'reject', exp: number }}
 */
export function verifyChatAction(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Invalid token');
  }
  const [payloadPart, sigPart] = token.split('.');
  if (!payloadPart || !sigPart) throw new Error('Invalid token');
  const expected = crypto.createHmac('sha256', secret()).update(payloadPart).digest();
  const given = fromB64url(sigPart);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new Error('Invalid signature');
  }
  const body = JSON.parse(fromB64url(payloadPart).toString('utf8'));
  if (!body?.kind || !body?.id || !body?.action || !body?.exp) {
    throw new Error('Invalid payload');
  }
  if (body.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  if (!['finish', 'self'].includes(body.kind)) throw new Error('Invalid kind');
  if (!['approve', 'reject'].includes(body.action)) throw new Error('Invalid action');
  return body;
}
