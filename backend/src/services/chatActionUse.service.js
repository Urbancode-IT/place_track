import crypto from 'crypto';
import { query } from '../config/db.js';

let tableReady = false;

export function hashChatActionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export async function ensureChatActionUseTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS "ChatActionUse" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "tokenHash" TEXT UNIQUE NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('finish', 'self')),
      "requestId" TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
      "usedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_chat_action_use_request
      ON "ChatActionUse"(kind, "requestId")
  `);
  tableReady = true;
}

/** True if this request already had Approve or Reject from Chat (both buttons expire). */
export async function isChatActionRequestUsed(kind, requestId) {
  await ensureChatActionUseTable();
  const r = await query(
    `SELECT 1 FROM "ChatActionUse" WHERE kind = $1 AND "requestId" = $2 LIMIT 1`,
    [kind, requestId]
  );
  return r.rows.length > 0;
}

export async function isChatActionTokenUsed(token) {
  await ensureChatActionUseTable();
  const r = await query(`SELECT 1 FROM "ChatActionUse" WHERE "tokenHash" = $1 LIMIT 1`, [
    hashChatActionToken(token),
  ]);
  return r.rows.length > 0;
}

export async function markChatActionUsed(token, kind, requestId, action) {
  await ensureChatActionUseTable();
  await query(
    `INSERT INTO "ChatActionUse" ("tokenHash", kind, "requestId", action)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("tokenHash") DO NOTHING`,
    [hashChatActionToken(token), kind, requestId, action]
  );
}
