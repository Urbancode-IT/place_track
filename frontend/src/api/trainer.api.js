import { api } from './axios.instance';

export const trainerApi = {
  list: () => api.get('/trainers'),
  create: (data) => api.post('/trainers', data),
  allow: (id) => api.post(`/trainers/${id}/allow`),
  reject: (id) => api.post(`/trainers/${id}/reject`),
  revoke: (id) => api.post(`/trainers/${id}/reject`),
  delete: (id) => api.delete(`/trainers/${id}`),
  getInterviews: (id) => api.get(`/trainers/${id}/interviews`),
  notify: (id, interviewId) => api.post(`/trainers/${id}/notify`, { interviewId }),
};
