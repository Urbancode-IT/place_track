import { api } from './axios.instance';

export const jobApplicationApi = {
  list: (params) => api.get('/job-applications', { params }),
  getDaily: (params) => api.get('/job-applications/daily', { params }),
  listSpocs: (params) => api.get('/job-applications/spocs', { params }),
  listStudents: (params) => api.get('/job-applications/students', { params }),
  listPortals: () => api.get('/job-applications/portals'),
  create: (data) => api.post('/job-applications', data),
  update: (id, data) => api.put(`/job-applications/${id}`, data),
  delete: (id) => api.delete(`/job-applications/${id}`),
};
