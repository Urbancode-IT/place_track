import { z } from 'zod';

export const publicQaSubmitSchema = z.object({
  studentEmail: z.string().email(),
  company: z.string().max(200).optional(),
  /** e.g. Frontend / Backend / Database — course-specific list from meta */
  topic: z.string().trim().min(1, 'Choose a topic').max(80),
  question: z.string().trim().min(1, 'Question is required').max(2000),
  answer: z.string().trim().min(1, 'Answer is required').max(8000),
});

export const publicQaMetaSchema = z.object({
  studentEmail: z.string().email(),
});
