import { api } from './axios.instance';

export const interviewFinishRequestApi = {
  list: () => api.get('/interview-finish-requests'),
  approve: (id) => api.post(`/interview-finish-requests/${id}/approve`),
  reject: (id) => api.post(`/interview-finish-requests/${id}/reject`),
};
