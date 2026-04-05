-- Student interview finish form: trainer performance review (good / bad / excellent + notes)

ALTER TABLE "Interview" ADD COLUMN IF NOT EXISTS "trainerReviewRating" TEXT;
ALTER TABLE "Interview" ADD COLUMN IF NOT EXISTS "trainerReviewNotes" TEXT;
