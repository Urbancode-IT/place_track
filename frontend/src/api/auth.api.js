import { api } from './axios.instance';

export const authApi = {
  login: (body) => api.post('/auth/login', body),
  register: (body) => api.post('/auth/register', body),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh-token', {}),
  me: () => api.get('/auth/me'),
};
