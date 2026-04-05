import { z } from 'zod';

const courseEnum = z.enum(['FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT']);

export const createStudentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  course: courseEnum,
  batchId: z.string().optional(),
  selfIntro: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const selfIntroSchema = z.object({
  selfIntro: z.string(),
});
