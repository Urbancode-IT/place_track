import { z } from 'zod';

export const createHonestReviewLinkSchema = z.object({
  studentId: z.string().uuid(),
});

export const honestReviewTokenParamSchema = z.object({
  token: z.string().min(10, 'Invalid token'),
});

export const publicHonestReviewSubmitSchema = z.object({
  content: z.string().min(10, 'Write at least 10 characters').max(8000),
});

/** Common link: student identifies with registered email */
export const publicHonestReviewCommonSubmitSchema = z.object({
  email: z.string().trim().min(3).email('Enter a valid email'),
  content: z.string().min(10, 'Write at least 10 characters').max(8000),
});

export const studentHonestReviewListQuerySchema = z.object({
  studentId: z.string().uuid(),
});
