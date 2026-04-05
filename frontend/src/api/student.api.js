import { api } from './axios.instance';

export const studentApi = {
  list: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  getInterviews: (id) => api.get(`/students/${id}/interviews`),
  getQa: (id) => api.get(`/students/${id}/qa`),
  updateSelfIntro: (id, selfIntro) => api.put(`/students/${id}/self-intro`, { selfIntro }),
  uploadResume: (id, file) => {
    const form = new FormData();
    form.append('resume', file);
    return api.post(`/students/${id}/resume`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  addQa: (id, data) => api.post(`/students/${id}/qa`, data),
};
