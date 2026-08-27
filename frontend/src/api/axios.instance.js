import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { API_BASE_URL } from '@/lib/apiConfig';

const API_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshPath = API_URL.endsWith('/')
    ? `${API_URL}auth/refresh-token`
    : `${API_URL}/auth/refresh-token`;
  const { data } = await axios.post(refreshPath, {}, { withCredentials: true });
  const accessToken = data.data?.accessToken;
  if (!accessToken) throw new Error('No access token in refresh response');
  useAuthStore.getState().setAuth(useAuthStore.getState().user, accessToken);
  return accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const accessToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
