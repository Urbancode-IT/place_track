-- Run once on existing DB (pgAdmin / psql) after main schema exists.
-- Student opens magic link, submits interview details; admin/trainer approves → real Interview row.

CREATE TABLE IF NOT EXISTS "StudentInterviewRequest" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token TEXT NOT NULL UNIQUE,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  "createdByUserId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  company TEXT,
  round TEXT,
  date TIMESTAMPTZ,
  "timeSlot" TEXT,
  "hrNumber" TEXT,
  room TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  "submittedAt" TIMESTAMPTZ,
  "reviewedAt" TIMESTAMPTZ,
  "reviewedByUserId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "resultingInterviewId" TEXT REFERENCES "Interview"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sir_student ON "StudentInterviewRequest"("studentId");
CREATE INDEX IF NOT EXISTS idx_sir_status ON "StudentInterviewRequest"(status);
CREATE INDEX IF NOT EXISTS idx_sir_token ON "StudentInterviewRequest"(token);
