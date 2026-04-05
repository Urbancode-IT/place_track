import { z } from 'zod';

export const finishProposedStatusEnum = z.enum([
  'SHORTLISTED',
  'SELECTED',
  'REJECTED',
  'AWAITING_RESPONSE',
  'NO_RESPONSE',
  'RESCHEDULED',
]);

export const trainerReviewRatingEnum = z.enum(['GOOD', 'BAD', 'EXCELLENT']);

export const publicFinishApplySchema = z
  .object({
    studentEmail: z.string().email(),
    company: z.string().min(1).max(200),
    proposedStatus: finishProposedStatusEnum,
    feedback: z.string().optional(),
    /** How the student rates trainer support (not required when only rescheduling) */
    trainerReviewRating: trainerReviewRatingEnum.optional(),
    trainerReviewNotes: z.string().max(2000).optional(),
    /** Sent only after “Check interview”; omit to leave trainers unchanged on approve */
    trainerIds: z.array(z.string().min(1)).max(40).optional(),
    /** Required when proposedStatus is RESCHEDULED (YYYY-MM-DD from date input) */
    rescheduleDate: z.string().max(40).optional(),
    rescheduleTimeSlot: z.string().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.proposedStatus === 'RESCHEDULED') {
      if (!data.rescheduleDate?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'New interview date is required when rescheduling.',
          path: ['rescheduleDate'],
        });
      }
      if (!data.rescheduleTimeSlot?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'New time / slot is required when rescheduling.',
          path: ['rescheduleTimeSlot'],
        });
      }
      return;
    }
    if (!data.trainerReviewRating) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Trainer review rating is required for this outcome.',
        path: ['trainerReviewRating'],
      });
    }
  });

export const publicFinishPreviewSchema = z.object({
  studentEmail: z.string().email(),
  company: z.string().min(1).max(200),
});

export const requestIdParamSchema = z.object({
  id: z.string().uuid(),
});
