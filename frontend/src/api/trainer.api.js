import { api } from './axios.instance';

export const trainerApi = {
  list: () => api.get('/trainers'),
  create: (data) => api.post('/trainers', data),
  getInterviews: (id) => api.get(`/trainers/${id}/interviews`),
  notify: (id, interviewId) => api.post(`/trainers/${id}/notify`, { interviewId }),
};
