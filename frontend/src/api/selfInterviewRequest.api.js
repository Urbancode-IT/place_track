import { api } from './axios.instance';

export const selfInterviewRequestApi = {
  createLink: (studentId) => api.post('/self-interview-requests', { studentId }),
  list: (params = {}) => api.get('/self-interview-requests', { params }),
  approve: (id, body = {}) => api.post(`/self-interview-requests/${id}/approve`, body),
  reject: (id) => api.post(`/self-interview-requests/${id}/reject`),
};
