import { z } from 'zod';

const statusEnum = z.enum([
  'SCHEDULED', 'SHORTLISTED', 'SELECTED', 'REJECTED',
  'AWAITING_RESPONSE', 'RESCHEDULED', 'NO_RESPONSE',
]);

export const createInterviewSchema = z.object({
  studentId: z.string().uuid(),
  company: z.string().min(1).max(200),
  round: z.string().min(1).max(100),
  date: z.coerce.date(),
  timeSlot: z.string().min(1).max(50),
  hrNumber: z.string().optional(),
  room: z.string().optional(),
  comments: z.string().optional(),
  trainerIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateInterviewSchema = z.object({
  studentId: z.string().uuid().optional(),
  company: z.string().min(1).max(200).optional(),
  round: z.string().min(1).max(100).optional(),
  date: z.coerce.date().optional(),
  timeSlot: z.string().min(1).max(50).optional(),
  hrNumber: z.string().optional(),
  room: z.string().optional(),
  comments: z.string().optional(),
  status: statusEnum.optional(),
  trainerIds: z.array(z.string().uuid()).optional(),
});

export const updateStatusSchema = z.object({
  status: statusEnum,
});

export const interviewIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const trainersBodySchema = z.object({
  trainerIds: z.array(z.string().uuid()).min(1),
});
