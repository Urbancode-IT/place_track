const DEFAULT_PUBLIC_URL = 'https://placetrack.urbancode.in';

function splitUrls(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function isLocalhost(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

/**
 * Public site URL for Google Chat / email links.
 * Never uses FRONTEND_URL (often localhost on VPS). Override with PUBLIC_FRONTEND_URL if needed.
 */
export function getPublicFrontendUrl() {
  const override = splitUrls(process.env.PUBLIC_FRONTEND_URL).find((url) => !isLocalhost(url));
  return override || DEFAULT_PUBLIC_URL;
}
