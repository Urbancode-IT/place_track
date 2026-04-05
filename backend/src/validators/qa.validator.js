import { z } from 'zod';

export const qaStatusEnum = z.enum(['PREPARED', 'NEEDS_WORK', 'PENDING']);

export const createQaSchema = z.object({
  question: z.string().min(1).max(1000),
  answer: z.string().optional(),
  category: z.string().optional(),
  status: qaStatusEnum.optional().default('PENDING'),
});

export const qaIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateQaBodySchema = z.object({
  question: z.string().min(1).max(1000).optional(),
  answer: z.string().optional(),
  category: z.string().optional(),
  status: qaStatusEnum.optional(),
});

export const updateQaSchema = qaIdParamSchema.merge(updateQaBodySchema);
