import { api } from './axios.instance';

export const dashboardApi = {
  pendingSelfSubmits: () => api.get('/dashboard/pending-self-submits'),
  pendingInterviewFinishes: () => api.get('/dashboard/pending-interview-finishes'),
  stats: () => api.get('/dashboard/stats'),
  today: (date) => api.get('/dashboard/today', { params: date ? { date } : {} }),
  activity: () => api.get('/dashboard/activity'),
  analytics: () => api.get('/dashboard/analytics'),
};
