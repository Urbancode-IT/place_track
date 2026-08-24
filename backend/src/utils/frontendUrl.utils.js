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
 * Public site URL for links in Google Chat / email (never localhost).
 * Prefers FRONTEND_URL when it is not local; else first non-local CORS_ORIGIN entry.
 */
export function getPublicFrontendUrl() {
  const candidates = [
    ...splitUrls(process.env.FRONTEND_URL),
    ...splitUrls(process.env.CORS_ORIGIN),
    ...splitUrls(process.env.PUBLIC_FRONTEND_URL),
  ];

  const publicUrl = candidates.find((url) => !isLocalhost(url));
  return publicUrl || DEFAULT_PUBLIC_URL;
}
