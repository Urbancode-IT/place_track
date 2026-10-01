-- Job Applications: daily application activity (one row per date + SPOC + student + portal).
-- Run once on existing DB (pgAdmin / psql), or: npm run db:migrate-job-applications

CREATE TABLE IF NOT EXISTS "JobApplicationDaily" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  "spocUserId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  portal TEXT NOT NULL,
  "applicationCount" INT NOT NULL DEFAULT 0 CHECK ("applicationCount" >= 0),
  "callsReceived" INT NOT NULL DEFAULT 0 CHECK ("callsReceived" >= 0),
  "interviewsScheduled" INT NOT NULL DEFAULT 0 CHECK ("interviewsScheduled" >= 0),
  "companyName" TEXT,
  "interviewId" TEXT REFERENCES "Interview"(id) ON DELETE SET NULL,
  "interviewLink" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jad_date ON "JobApplicationDaily"(date);
CREATE INDEX IF NOT EXISTS idx_jad_spoc ON "JobApplicationDaily"("spocUserId");
CREATE INDEX IF NOT EXISTS idx_jad_student ON "JobApplicationDaily"("studentId");
CREATE INDEX IF NOT EXISTS idx_jad_portal ON "JobApplicationDaily"(portal);

ALTER TABLE "JobApplicationDaily" ADD COLUMN IF NOT EXISTS "interviewLink" TEXT;

-- Multi-link: attribute several Schedule interviews to one daily portal row
ALTER TABLE "JobApplicationDaily" ADD COLUMN IF NOT EXISTS "interviewIds" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "JobApplicationDaily"
SET "interviewIds" = ARRAY["interviewId"]
WHERE "interviewId" IS NOT NULL
  AND (cardinality("interviewIds") = 0 OR "interviewIds" IS NULL);

CREATE INDEX IF NOT EXISTS idx_jad_interview_ids ON "JobApplicationDaily" USING GIN ("interviewIds");

-- Canonical portal names so Naukri / naukri / NAUKRI collapse to one spelling
UPDATE "JobApplicationDaily" SET portal = 'Naukri' WHERE LOWER(btrim(portal)) = 'naukri';
UPDATE "JobApplicationDaily" SET portal = 'Monster India' WHERE LOWER(btrim(portal)) = 'monster india';
UPDATE "JobApplicationDaily" SET portal = 'LinkedIn' WHERE LOWER(btrim(portal)) = 'linkedin';
UPDATE "JobApplicationDaily" SET portal = 'Shine' WHERE LOWER(btrim(portal)) = 'shine';
UPDATE "JobApplicationDaily" SET portal = 'TimesJobs' WHERE LOWER(btrim(portal)) = 'timesjobs';
UPDATE "JobApplicationDaily" SET portal = 'Indeed' WHERE LOWER(btrim(portal)) = 'indeed';
UPDATE "JobApplicationDaily" SET portal = 'Glassdoor' WHERE LOWER(btrim(portal)) = 'glassdoor';
UPDATE "JobApplicationDaily" SET portal = 'loop CV' WHERE LOWER(btrim(portal)) = 'loop cv';
UPDATE "JobApplicationDaily" SET portal = 'Instahyre' WHERE LOWER(btrim(portal)) = 'instahyre';
UPDATE "JobApplicationDaily" SET portal = 'foundit' WHERE LOWER(btrim(portal)) = 'foundit';
UPDATE "JobApplicationDaily" SET portal = 'Cutshort' WHERE LOWER(btrim(portal)) = 'cutshort';
UPDATE "JobApplicationDaily" SET portal = 'wellfound' WHERE LOWER(btrim(portal)) = 'wellfound';
UPDATE "JobApplicationDaily" SET portal = 'freshersworld' WHERE LOWER(btrim(portal)) = 'freshersworld';
UPDATE "JobApplicationDaily" SET portal = 'hirist.tech' WHERE LOWER(btrim(portal)) = 'hirist.tech';

-- Keep the newest row when the same student/portal was saved under different casing
DELETE FROM "JobApplicationDaily" a
USING "JobApplicationDaily" b
WHERE a.id <> b.id
  AND a.date = b.date
  AND a."spocUserId" = b."spocUserId"
  AND a."studentId" = b."studentId"
  AND LOWER(btrim(a.portal)) = LOWER(btrim(b.portal))
  AND (
    a."updatedAt" < b."updatedAt"
    OR (a."updatedAt" = b."updatedAt" AND a.id < b.id)
  );

ALTER TABLE "JobApplicationDaily" DROP CONSTRAINT IF EXISTS "JobApplicationDaily_date_spocUserId_studentId_portal_key";

CREATE UNIQUE INDEX IF NOT EXISTS idx_jad_unique_ci
  ON "JobApplicationDaily" (date, "spocUserId", "studentId", LOWER(btrim(portal)));

-- One daily row can hold N interview slots (company + date + time). Meeting URLs come from the student.
ALTER TABLE "JobApplicationDaily" ADD COLUMN IF NOT EXISTS "interviewSlots" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "JobApplicationDaily" j
SET "interviewSlots" = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'companyName', COALESCE(NULLIF(btrim(j."companyName"), ''), 'Interview'),
    'date', j.date::text,
    'timeSlot', '',
    'meetingLink', j."interviewLink",
    'interviewId', j."interviewId"
  )
)
WHERE j."interviewsScheduled" > 0
  AND (j."interviewSlots" IS NULL OR j."interviewSlots" = '[]'::jsonb);

-- Keep the SPOC name after the trainer account is deleted.
ALTER TABLE "JobApplicationDaily" ADD COLUMN IF NOT EXISTS "spocName" TEXT;

UPDATE "JobApplicationDaily" j
SET "spocName" = u.name
FROM "User" u
WHERE j."spocUserId" = u.id
  AND (j."spocName" IS NULL OR btrim(j."spocName") = '');

ALTER TABLE "JobApplicationDaily" ALTER COLUMN "spocUserId" DROP NOT NULL;

ALTER TABLE "JobApplicationDaily" DROP CONSTRAINT IF EXISTS "JobApplicationDaily_spocUserId_fkey";

ALTER TABLE "JobApplicationDaily"
  ADD CONSTRAINT "JobApplicationDaily_spocUserId_fkey"
  FOREIGN KEY ("spocUserId") REFERENCES "User"(id) ON DELETE SET NULL;
