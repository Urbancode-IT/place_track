import { publicApi } from './public.api';

export const publicSelfInterviewApi = {
  /** After interview — outcome + company match */
  finishPreview: (body) => publicApi.post('/public/interview-finish/preview', body),
  finishApply: (body) => publicApi.post('/public/interview-finish/apply', body),
  /** Shared form — one URL for every student */
  apply: (body) => publicApi.post('/public/self-interview/apply', body),
  getMeta: (token) => publicApi.get(`/public/self-interview/${token}`),
  submit: (token, body) => publicApi.put(`/public/self-interview/${token}`, body),
};
