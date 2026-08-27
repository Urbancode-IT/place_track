-- Extra fields for deferred public finish → admin approve flow.
ALTER TABLE "InterviewFinishRequest" ADD COLUMN IF NOT EXISTS "trainerReviewRating" TEXT;
ALTER TABLE "InterviewFinishRequest" ADD COLUMN IF NOT EXISTS "trainerReviewNotes" TEXT;
ALTER TABLE "InterviewFinishRequest" ADD COLUMN IF NOT EXISTS "rescheduleDate" TIMESTAMPTZ;
ALTER TABLE "InterviewFinishRequest" ADD COLUMN IF NOT EXISTS "rescheduleTimeSlot" TEXT;
