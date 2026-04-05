import { api } from './axios.instance';

export const pushApi = {
  registerToken: (data) => api.post('/push/register-token', data),
  unregisterToken: (data) => api.post('/push/unregister-token', data),
};

