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

/** Admin / trainer Questions module list filters */
export const qaAdminListSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(200).optional().transform((s) => (s?.trim() ? s.trim() : undefined)),
  course: z.string().max(80).optional().transform((s) => (s?.trim() ? s.trim() : undefined)),
  topic: z.string().max(80).optional().transform((s) => (s?.trim() ? s.trim() : undefined)),
  status: z
    .enum(['PREPARED', 'NEEDS_WORK', 'PENDING', ''])
    .optional()
    .transform((s) => (s ? s : undefined)),
  studentId: z.string().min(1).optional().transform((s) => (s?.trim() ? s.trim() : undefined)),
});

