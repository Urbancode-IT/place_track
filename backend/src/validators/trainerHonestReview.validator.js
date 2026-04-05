import { z } from 'zod';

export const createTrainerHonestReviewSchema = z.object({
  studentId: z.string().uuid(),
  interviewId: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), z.string().uuid().optional()),
  content: z.string().min(10, 'Write at least a few words').max(8000),
});
