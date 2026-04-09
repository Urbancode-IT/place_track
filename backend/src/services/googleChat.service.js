import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends a message to a Google Chat space via Webhook URL.
 * @param {string} text - Message content (markdown supported)
 */
export async function sendToGoogleChat(text) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[google-chat] GOOGLE_CHAT_WEBHOOK_URL not configured');
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`Google Chat API responded with ${res.status}`);
    }
  } catch (err) {
    console.error('[google-chat] Failed to send message:', err.message);
  }
}
