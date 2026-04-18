/**
 * Google Chat incoming webhook — POST JSON `{ text: "..." }`.
 * Env is loaded by server `loadEnv.js` before any route/service import.
 */

/**
 * @param {string} text - Message content (markdown supported)
 * @returns {Promise<{ ok: boolean, error?: string, statusCode?: number }>}
 */
export async function sendToGoogleChat(text) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn('[google-chat] GOOGLE_CHAT_WEBHOOK_URL not configured');
    return { ok: false, error: 'GOOGLE_CHAT_WEBHOOK_URL not configured' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text }),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error('[google-chat] HTTP', res.status, raw.slice(0, 800));
      return {
        ok: false,
        error: `HTTP ${res.status}`,
        statusCode: res.status,
      };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[google-chat] Failed to send message:', message);
    return { ok: false, error: message };
  }
}
