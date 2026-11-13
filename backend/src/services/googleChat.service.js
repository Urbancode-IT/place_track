/**
 * Google Chat incoming webhook — text or cardsV2 (Approve/Reject buttons via openLink).
 * Env is loaded by server `loadEnv.js` before any route/service import.
 */

/**
 * @param {object} body - Full webhook JSON body
 * @returns {Promise<{ ok: boolean, error?: string, statusCode?: number }>}
 */
export async function sendGoogleChatPayload(body) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn('[google-chat] GOOGLE_CHAT_WEBHOOK_URL not configured');
    return { ok: false, error: 'GOOGLE_CHAT_WEBHOOK_URL not configured' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body),
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

/**
 * @param {string} text - Message content (markdown supported)
 */
export async function sendToGoogleChat(text) {
  return sendGoogleChatPayload({ text });
}

/**
 * @param {{ cardId: string, headerTitle: string, headerSubtitle?: string, bodyLines: string[], approveUrl: string, rejectUrl: string }} opts
 */
export async function sendGoogleChatApprovalCard(opts) {
  const {
    cardId,
    headerTitle,
    headerSubtitle,
    bodyLines = [],
    approveUrl,
    rejectUrl,
  } = opts;

  const widgets = [];
  if (bodyLines.length) {
    widgets.push({
      textParagraph: {
        text: bodyLines.filter(Boolean).join('<br>'),
      },
    });
  }
  widgets.push({
    buttonList: {
      buttons: [
        {
          text: 'Approve',
          onClick: { openLink: { url: approveUrl } },
        },
        {
          text: 'Reject',
          onClick: { openLink: { url: rejectUrl } },
        },
      ],
    },
  });

  return sendGoogleChatPayload({
    cardsV2: [
      {
        cardId: String(cardId).slice(0, 64),
        card: {
          header: {
            title: headerTitle,
            ...(headerSubtitle ? { subtitle: headerSubtitle } : {}),
          },
          sections: [{ widgets }],
        },
      },
    ],
  });
}
