import { query } from '../config/db.js';
import { getFirebaseAdmin } from '../config/firebaseAdmin.js';

export async function upsertUserDeviceToken(userId, token, platform = 'web') {
  if (!userId || !token) return;
  await query(
    `INSERT INTO "UserDevice" ("userId", token, platform, "updatedAt")
     VALUES ($1, $2, $3, now())
     ON CONFLICT ("userId", token)
     DO UPDATE SET platform = EXCLUDED.platform, "updatedAt" = now()`,
    [userId, token, platform]
  );
}

export async function removeUserDeviceToken(userId, token) {
  if (!userId || !token) return;
  await query(`DELETE FROM "UserDevice" WHERE "userId" = $1 AND token = $2`, [userId, token]);
}

export async function sendPushToUsers(userIds, payload) {
  const admin = getFirebaseAdmin();
  if (!admin) return { ok: false, reason: 'FCM_NOT_CONFIGURED' };

  if (!userIds?.length) return { ok: true, sent: 0 };

  const r = await query(
    `SELECT DISTINCT token FROM "UserDevice" WHERE "userId" = ANY($1)`,
    [userIds]
  );
  const tokens = r.rows.map((x) => x.token).filter(Boolean);
  if (!tokens.length) return { ok: true, sent: 0 };

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    webpush: payload.link
      ? {
          fcmOptions: { link: payload.link },
        }
      : undefined,
  };

  const resp = await admin.messaging().sendEachForMulticast(message);

  // Best-effort cleanup of invalid tokens
  const invalidTokens = [];
  resp.responses.forEach((r, idx) => {
    if (!r.success) {
      const code = r.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
        invalidTokens.push(tokens[idx]);
      }
    }
  });
  if (invalidTokens.length) {
    await query(`DELETE FROM "UserDevice" WHERE token = ANY($1)`, [invalidTokens]).catch(() => {});
  }

  return { ok: true, sent: resp.successCount, failed: resp.failureCount };
}

