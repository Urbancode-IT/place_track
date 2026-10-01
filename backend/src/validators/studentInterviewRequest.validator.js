import { z } from 'zod';
import {
  normalizeMeetingLink,
  isValidHttpUrl,
} from '../utils/jobApplication.utils.js';

export const createLinkSchema = z.object({
  studentId: z.string().uuid(),
});

export const tokenParamSchema = z.object({
  token: z.string().uuid(),
});

const meetingLinkSchema = z
  .string()
  .min(1, 'Meeting link is required')
  .max(2000)
  .transform((v) => normalizeMeetingLink(v))
  .refine((v) => isValidHttpUrl(v), {
    message: 'Paste a valid meeting URL (https://…)',
  });

export const publicSubmitSchema = z.object({
  company: z.string().min(1).max(200),
  round: z.string().min(1).max(100),
  date: z.coerce.date(),
  timeSlot: z.string().min(1).max(80),
  hrNumber: z.string().optional(),
  room: meetingLinkSchema,
  comments: z.string().optional(),
  course: z.enum(['FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT']).optional(),
});

/** Shared /interview/apply form — student identifies by institute email or phone */
export const publicApplySchema = publicSubmitSchema.extend({
  name: z.string().min(1).max(100).optional(),
  studentEmail: z.string().email().optional().or(z.literal('')),
  studentPhone: z.string().min(1).max(20).optional().or(z.literal('')),
}).refine(data => data.studentEmail || data.studentPhone, {
  message: "Provide either Email or Phone Number to identify yourself",
  path: ["studentEmail"]
});

export const requestIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const approveRequestSchema = z.object({
  trainerIds: z.array(z.string().uuid()).optional().default([]),
  /** Room or meeting link — set when approving (student apply form may omit it) */
  room: z.string().max(500).optional(),
});

export const listRequestsQuerySchema = z.object({
  status: z.enum(['ISSUED', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
});
