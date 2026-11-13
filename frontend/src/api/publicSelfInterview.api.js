import { publicApi } from './public.api';

export const publicSelfInterviewApi = {
  /** After interview — outcome + company match */
  finishPreview: (body) => publicApi.post('/public/interview-finish/preview', body),
  finishApply: (body) => publicApi.post('/public/interview-finish/apply', body),
  /** Student fills interview Q&A into their bank */
  qaMeta: (body) => publicApi.post('/public/qa/meta', body),
  submitQa: (body) => publicApi.post('/public/qa/submit', body),
  /** Shared form — one URL for every student */
  apply: (body) => publicApi.post('/public/self-interview/apply', body),
  getMeta: (token) => publicApi.get(`/public/self-interview/${token}`),
  submit: (token, body) => publicApi.put(`/public/self-interview/${token}`, body),
  registerStudent: (body) => publicApi.post('/public/students', body),
  listInterviews: (course, date) => publicApi.get('/public/interviews', { params: { course, date } }),
};
