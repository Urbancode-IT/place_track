-- User.allowed: trainers must be allowed before they can sign in or be assigned.
-- Safe to run twice: add nullable, backfill only NULLs, then default + NOT NULL.
-- Run once on an existing DB, or: npm run db:migrate-user-allowed

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS allowed BOOLEAN;

UPDATE "User"
SET allowed = CASE
  WHEN role = 'TRAINER'
   AND LOWER(email) NOT IN ('trainer1@kattraan.com', 'trainer2@kattraan.com')
  THEN true
  ELSE false
END
WHERE allowed IS NULL;

ALTER TABLE "User" ALTER COLUMN allowed SET DEFAULT false;

ALTER TABLE "User" ALTER COLUMN allowed SET NOT NULL;
