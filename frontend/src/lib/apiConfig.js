function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();

  // In production (placetrack.urbancode.in), use same-origin /api (proxied by vercel.json to Linode: api.placetrack.urbancode.in)
  if (typeof window !== 'undefined' && window.location.hostname.includes('placetrack.urbancode.in')) {
    return '/api';
  }

  return envUrl || '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function getApiHealthUrl() {
  if (API_BASE_URL.startsWith('http')) {
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}/health`;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/health`;
}
