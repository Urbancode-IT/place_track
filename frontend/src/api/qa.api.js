import { api } from './axios.instance';

export const qaApi = {
  /** Admin / trainer Questions module */
  list: (params) => api.get('/qa', { params }),
  update: (id, data) => api.put(`/qa/${id}`, data),
  delete: (id) => api.delete(`/qa/${id}`),
};
