import { z } from 'zod';

export const publicQaSubmitSchema = z.object({
  studentEmail: z.string().email(),
  company: z.string().max(200).optional(),
  question: z.string().trim().min(1, 'Question is required').max(2000),
  answer: z.string().trim().max(8000).optional(),
});
