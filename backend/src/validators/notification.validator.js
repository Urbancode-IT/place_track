import { z } from 'zod';

/** Dummy interview-scheduled mail to trainers (admin testing) */
export const testInterviewEmailSchema = z.object({
  trainerIds: z.array(z.string().uuid()).min(1).max(20),
  studentName: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  round: z.string().max(100).optional(),
  date: z.string().max(50).optional(),
  timeSlot: z.string().max(200).optional(),
  hrNumber: z.string().max(100).optional(),
  room: z.string().max(100).optional(),
});
