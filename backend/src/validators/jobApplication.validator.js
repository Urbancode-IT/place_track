import { z } from 'zod';
import {
  normalizePortalName,
  findDuplicateSlotTime,
  isValidDateOnly,
} from '../utils/jobApplication.utils.js';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(isValidDateOnly, 'Invalid calendar date');

/** Daily-entry caps. Larger values are rejected before they hit Postgres. */
const APPLICATION_COUNT_MAX = 50;
const CALLS_RECEIVED_MAX = 20;
const INTERVIEWS_SCHEDULED_MAX = 10;

const applicationCountSchema = z.coerce.number().int().min(0).max(APPLICATION_COUNT_MAX);
const callsReceivedSchema = z.coerce.number().int().min(0).max(CALLS_RECEIVED_MAX);
const interviewsScheduledSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(INTERVIEWS_SCHEDULED_MAX);

const uuidOrNull = z.string().uuid().optional().nullable();

const courseEnum = z.enum(['FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT']);

const interviewIdsSchema = z
  .array(z.string().uuid())
  .max(INTERVIEWS_SCHEDULED_MAX)
  .optional()
  .nullable()
  .transform((v) => (v == null ? undefined : [...new Set(v)]));

const portalSchema = z
  .string()
  .min(1, 'Portal is required')
  .max(100)
  .transform((v) => normalizePortalName(v))
  .pipe(z.string().min(1, 'Portal is required').max(100));

const interviewSlotSchema = z.object({
  id: z.preprocess(
    (v) => (v == null || v === '' ? undefined : v),
    z.string().min(1).max(80).optional()
  ),
  companyName: z.string().min(1, 'Company is required').max(200),
  date: dateOnly,
  timeSlot: z.string().min(1, 'Time is required').max(80),
});

export const jobApplicationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const dailyQuerySchema = z.object({
  date: dateOnly,
  spocUserId: z.string().uuid().optional(),
});

function refineDateRange(data, ctx) {
  if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dateFrom must be on or before dateTo',
      path: ['dateFrom'],
    });
  }
}

export const historyQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
    spocUserId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    course: z.string().max(100).optional(),
    portal: z
      .string()
      .max(100)
      .optional()
      .transform((v) => (v ? normalizePortalName(v) : v)),
    search: z.string().max(200).optional(),
  })
  .superRefine(refineDateRange);

export const studentsQuerySchema = z
  .object({
    spocUserId: z.string().uuid().optional(),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
  })
  .superRefine(refineDateRange);

const baseBody = z.object({
  date: dateOnly,
  spocUserId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  studentName: z.string().trim().min(2, 'Enter a student name').max(100).optional(),
  course: courseEnum.optional(),
  portal: portalSchema,
  applicationCount: applicationCountSchema,
  callsReceived: callsReceivedSchema.default(0),
  interviewsScheduled: interviewsScheduledSchema.default(0),
  companyName: z.string().max(500).optional().nullable(),
  interviewId: uuidOrNull,
  interviewIds: interviewIdsSchema,
  interviewSlots: z.array(interviewSlotSchema).max(INTERVIEWS_SCHEDULED_MAX).optional().default([]),
});

function refineInterviewSlots(data, ctx) {
  const interviews = data.interviewsScheduled ?? 0;
  if (interviews <= 0) return;

  const slots = Array.isArray(data.interviewSlots) ? data.interviewSlots : [];
  if (slots.length !== interviews) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Add ${interviews} interview slot${interviews === 1 ? '' : 's'} with company, date, and time`,
      path: ['interviewSlots'],
    });
    return;
  }

  const dup = findDuplicateSlotTime(slots);
  if (dup) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Two interviews on the same day need different times',
      path: ['interviewSlots', dup.index, 'timeSlot'],
    });
  }
}

export const createJobApplicationSchema = baseBody.superRefine((data, ctx) => {
  const hasId = Boolean(data.studentId);
  const hasName = Boolean(data.studentName);
  if (hasId === hasName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a student name',
      path: ['studentName'],
    });
  }
  if (hasName && !data.course) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Course is required',
      path: ['course'],
    });
  }
  refineInterviewSlots(data, ctx);
});

const updateFields = z.object({
  date: dateOnly.optional(),
  spocUserId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  portal: portalSchema.optional(),
  applicationCount: applicationCountSchema.optional(),
  callsReceived: callsReceivedSchema.optional(),
  interviewsScheduled: interviewsScheduledSchema.optional(),
  companyName: z.string().max(500).optional().nullable(),
  interviewId: uuidOrNull,
  interviewIds: interviewIdsSchema,
  interviewSlots: z.array(interviewSlotSchema).max(INTERVIEWS_SCHEDULED_MAX).optional(),
});

/** PUT /:id — extend so param `id` is validated with the body (avoid `.and()` dropping transforms). */
export const updateJobApplicationRequestSchema = updateFields
  .extend({ id: z.string().uuid() })
  .superRefine((data, ctx) => {
    if (data.interviewsScheduled === undefined && data.interviewSlots === undefined) return;
    if (data.interviewsScheduled === 0) return;
    refineInterviewSlots(
      {
        interviewsScheduled:
          data.interviewsScheduled ?? data.interviewSlots?.length ?? 0,
        interviewSlots: data.interviewSlots || [],
      },
      ctx
    );
  })
  .transform((data) => {
    if (data.interviewsScheduled === 0) {
      return { ...data, interviewSlots: [] };
    }
    return data;
  });
