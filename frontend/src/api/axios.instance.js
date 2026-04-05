import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Do not pass baseURL here: with API_URL="/api", axios would combine to /api/api/auth/refresh-token
        const refreshPath = API_URL.endsWith('/') ? `${API_URL}auth/refresh-token` : `${API_URL}/auth/refresh-token`;
        const { data } = await axios.post(refreshPath, {}, { withCredentials: true });
        useAuthStore.getState().setAuth(useAuthStore.getState().user, data.data?.accessToken);
        original.headers.Authorization = `Bearer ${data.data?.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
