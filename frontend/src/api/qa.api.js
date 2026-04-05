import { api } from './axios.instance';

export const qaApi = {
  update: (id, data) => api.put(`/qa/${id}`, data),
  delete: (id) => api.delete(`/qa/${id}`),
};
