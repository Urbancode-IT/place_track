import { z } from 'zod';

export const trainerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createTrainerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().optional(),
});
