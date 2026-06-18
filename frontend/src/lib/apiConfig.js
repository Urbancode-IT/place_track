/** API base used by axios (build-time VITE_API_URL, default /api for same-origin proxy). */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function getApiHealthUrl() {
  if (API_BASE_URL.startsWith('http')) {
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}/health`;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/health`;
}
