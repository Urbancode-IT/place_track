import { api } from './axios.instance';

export const honestReviewApi = {
  /** List student-submitted honest reviews for a student */
  listByStudent: (studentId) => api.get('/honest-review', { params: { studentId } }),
  /** Recent submissions (admin: all; trainer: their students only) */
  listRecent: (params) => api.get('/honest-review/recent', { params }),
};
