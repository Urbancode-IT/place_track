-- Student finish form: optional proposed trainer list (applied when request is approved).
ALTER TABLE "InterviewFinishRequest" ADD COLUMN IF NOT EXISTS "proposedTrainerIds" TEXT[];
