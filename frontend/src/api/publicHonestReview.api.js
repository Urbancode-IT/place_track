import { publicApi } from './public.api';

export const publicHonestReviewApi = {
  /** Legacy one-time token link */
  getMeta: (token) => publicApi.get(`/public/honest-review/${token}`),
  submit: (token, body) => publicApi.post(`/public/honest-review/${token}`, body),
  /** Common link (same URL for everyone) */
  getCommonMeta: () => publicApi.get('/public/honest-review/common'),
  submitCommon: (body) => publicApi.post('/public/honest-review/common', body),
};
