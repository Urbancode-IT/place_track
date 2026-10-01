import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { API_BASE_URL } from '@/lib/apiConfig';

const API_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function waitForAuthHydration() {
  const persist = useAuthStore.persist;
  if (!persist?.hasHydrated || persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
    if (persist.hasHydrated()) {
      unsub();
      resolve();
    }
  });
}

api.interceptors.request.use(async (config) => {
  await waitForAuthHydration();
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;
let refreshTimer = null;
let sessionEnding = false;

function refreshUrl() {
  return API_URL.endsWith('/') ? `${API_URL}auth/refresh-token` : `${API_URL}/auth/refresh-token`;
}

function accessTokenExpiryMs(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return 0;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function refreshAccessToken() {
  const { data } = await axios.post(refreshUrl(), {}, { withCredentials: true });
  const accessToken = data.data?.accessToken;
  if (!accessToken) throw new Error('No access token in refresh response');
  const { user, setAuth } = useAuthStore.getState();
  if (typeof setAuth === 'function') setAuth(user, accessToken);
  sessionEnding = false;
  return accessToken;
}

function refreshAccessTokenOnce() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function endSession() {
  if (sessionEnding) return;
  sessionEnding = true;
  clearRefreshTimer();
  const { logout, accessToken } = useAuthStore.getState();
  if (accessToken && typeof logout === 'function') logout();
}

function scheduleAccessRefresh(token) {
  clearRefreshTimer();
  if (!token || typeof window === 'undefined') return;
  const exp = accessTokenExpiryMs(token);
  if (!exp) return;
  const delay = Math.max(exp - Date.now() - 60_000, 0);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    if (!useAuthStore.getState().accessToken) return;
    refreshAccessTokenOnce().catch((err) => {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        endSession();
        return;
      }
      const still = useAuthStore.getState().accessToken;
      if (still) refreshTimer = setTimeout(() => scheduleAccessRefresh(still), 30_000);
    });
  }, delay);
}

function watchAccessToken(token) {
  if (token) {
    sessionEnding = false;
    scheduleAccessRefresh(token);
    return;
  }
  clearRefreshTimer();
}

function installRefreshSchedule() {
  if (typeof window === 'undefined') return;
  if (typeof useAuthStore.subscribe !== 'function' || !useAuthStore.persist?.onFinishHydration) return;

  if (useAuthStore.persist.hasHydrated?.()) {
    watchAccessToken(useAuthStore.getState().accessToken);
  }
  useAuthStore.persist.onFinishHydration((state) => {
    watchAccessToken(state?.accessToken);
  });
  useAuthStore.subscribe((state, prev) => {
    if (state.accessToken === prev?.accessToken) return;
    watchAccessToken(state.accessToken);
  });
}

installRefreshSchedule();

function isAuthCredentialRequest(config) {
  const url = String(config?.url || '');
  return /\/auth\/(login|register|refresh-token)(?:\?|$)/.test(url);
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    // Don't treat failed login/register as an expired session — that remounts /login and blinks the error away.
    if (
      err.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthCredentialRequest(original) &&
      !sessionEnding
    ) {
      original._retry = true;
      try {
        const accessToken = await refreshAccessTokenOnce();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshErr) {
        const status = refreshErr?.response?.status;
        if (status === 401 || status === 403) endSession();
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);
