import { useLocation } from 'react-router-dom';

export function isAdminPath(pathname) {
  return pathname === '/admin' || String(pathname || '').startsWith('/admin/');
}

/** Keep in-app links inside the admin module when the current page is under /admin. */
export function modulePath(pathname, path) {
  const raw = String(path || '/');
  const queryIndex = raw.indexOf('?');
  const pathOnly = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : raw.slice(queryIndex);
  const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  if (!isAdminPath(pathname)) return `${normalized}${query}`;
  const base = normalized === '/' ? '/admin' : `/admin${normalized}`;
  return `${base}${query}`;
}

/** Admins land in /admin. Trainers who aimed at /admin go back to the trainer home. */
export function landingPath(role, fromPath) {
  const from = fromPath && fromPath !== '/login' ? fromPath : '';
  if (role === 'ADMIN') {
    if (!from || from === '/') return '/admin';
    if (isAdminPath(from)) return from;
    return modulePath('/admin', from);
  }
  if (from && isAdminPath(from)) return '/';
  return from || '/';
}

export function useModulePath() {
  const { pathname } = useLocation();
  return (path) => modulePath(pathname, path);
}
