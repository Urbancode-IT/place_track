import { api } from './axios.instance.js';

export const systemApi = {
  mailStatus: () => api.get('/system/mail-status'),
};
