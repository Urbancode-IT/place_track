import { api } from './axios.instance';

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  readAll: () => api.patch('/notifications/read-all'),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (data) => api.put('/notifications/settings', data),
};
