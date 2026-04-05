-- Private trainer notes on a student (optionally tied to an interview they were assigned to).

CREATE TABLE IF NOT EXISTS "TrainerHonestReview" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "trainerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  "interviewId" TEXT REFERENCES "Interview"(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thr_trainer ON "TrainerHonestReview"("trainerId");
CREATE INDEX IF NOT EXISTS idx_thr_student ON "TrainerHonestReview"("studentId");
