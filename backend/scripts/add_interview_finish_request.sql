-- After interview: student submits outcome via shared link; admin approves → Interview.status updated.

CREATE TABLE IF NOT EXISTS "InterviewFinishRequest" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  "interviewId" TEXT NOT NULL REFERENCES "Interview"(id) ON DELETE CASCADE,
  "proposedStatus" TEXT NOT NULL CHECK ("proposedStatus" IN (
    'SHORTLISTED', 'SELECTED', 'REJECTED', 'AWAITING_RESPONSE', 'NO_RESPONSE', 'RESCHEDULED'
  )),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reviewedAt" TIMESTAMPTZ,
  "reviewedByUserId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ifr_interview ON "InterviewFinishRequest"("interviewId");
CREATE INDEX IF NOT EXISTS idx_ifr_status ON "InterviewFinishRequest"(status);
CREATE INDEX IF NOT EXISTS idx_ifr_student ON "InterviewFinishRequest"("studentId");
