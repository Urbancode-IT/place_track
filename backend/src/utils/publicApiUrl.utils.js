/**
 * Public HTTPS base for API (no trailing slash). Used for Google Chat action buttons.
 * Override with PUBLIC_API_URL (e.g. https://api.placetrack.urbancode.in).
 */
export function getPublicApiBaseUrl() {
  const override = (process.env.PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (override && !/localhost|127\.0\.0\.1/i.test(override)) return override;
  return 'https://api.placetrack.urbancode.in';
}
