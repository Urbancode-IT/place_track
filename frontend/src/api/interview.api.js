import { api } from './axios.instance';

export const interviewApi = {
  list: (params) => api.get('/interviews', { params }),
  getById: (id) => api.get(`/interviews/${id}`),
  create: (data) => api.post('/interviews', data),
  update: (id, data) => api.put(`/interviews/${id}`, data),
  delete: (id) => api.delete(`/interviews/${id}`),
  updateStatus: (id, status) => api.patch(`/interviews/${id}/status`, { status }),
  addTrainers: (id, trainerIds) => api.post(`/interviews/${id}/trainers`, { trainerIds }),
  removeTrainer: (id, trainerId) => api.delete(`/interviews/${id}/trainers/${trainerId}`),
};
