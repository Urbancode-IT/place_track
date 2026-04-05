-- PlaceTrack schema for PostgreSQL (run this in pgAdmin on database Placement_Tracking)

-- Enums as check constraints
CREATE TYPE role_enum AS ENUM ('ADMIN', 'TRAINER', 'STUDENT');
CREATE TYPE course_enum AS ENUM ('FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT');
CREATE TYPE interview_status_enum AS ENUM (
  'SCHEDULED', 'SHORTLISTED', 'SELECTED', 'REJECTED',
  'AWAITING_RESPONSE', 'RESCHEDULED', 'NO_RESPONSE'
);
CREATE TYPE qa_status_enum AS ENUM ('PREPARED', 'NEEDS_WORK', 'PENDING');

-- User
CREATE TABLE "User" (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       role_enum NOT NULL DEFAULT 'TRAINER',
  phone      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UserDevice (stores push tokens for FCM)
CREATE TABLE "UserDevice" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token        TEXT NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'web',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("userId", token)
);

-- Student
CREATE TABLE "Student" (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  course     course_enum NOT NULL,
  "batchId"  TEXT,
  "resumeUrl" TEXT,
  "photoUrl" TEXT,
  "selfIntro" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interview
CREATE TABLE "Interview" (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  company    TEXT NOT NULL,
  round      TEXT NOT NULL,
  date       TIMESTAMPTZ NOT NULL,
  "timeSlot" TEXT NOT NULL,
  "hrNumber" TEXT,
  room       TEXT,
  status     interview_status_enum NOT NULL DEFAULT 'SCHEDULED',
  comments   TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- InterviewTrainer
CREATE TABLE "InterviewTrainer" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "interviewId" TEXT NOT NULL REFERENCES "Interview"(id) ON DELETE CASCADE,
  "trainerId"  TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "notifiedAt" TIMESTAMPTZ,
  UNIQUE("interviewId", "trainerId")
);

-- QAEntry
CREATE TABLE "QAEntry" (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT,
  category   TEXT,
  status     qa_status_enum NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification
CREATE TABLE "Notification" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type         TEXT NOT NULL,
  message      TEXT NOT NULL,
  channel      TEXT NOT NULL,
  "toUserId"   TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "interviewId" TEXT REFERENCES "Interview"(id) ON DELETE SET NULL,
  "sentAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'SENT',
  read         BOOLEAN NOT NULL DEFAULT false
);

-- Indexes
CREATE INDEX idx_interview_student ON "Interview"("studentId");
CREATE INDEX idx_interview_date ON "Interview"(date);
CREATE INDEX idx_interview_trainer ON "InterviewTrainer"("trainerId");
CREATE INDEX idx_qa_student ON "QAEntry"("studentId");
CREATE INDEX idx_notification_user ON "Notification"("toUserId");
CREATE INDEX idx_userdevice_user ON "UserDevice"("userId");

-- Student self-submit interview (magic link → pending review → approved Interview)
CREATE TABLE "StudentInterviewRequest" (
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
CREATE INDEX idx_sir_student ON "StudentInterviewRequest"("studentId");
CREATE INDEX idx_sir_status ON "StudentInterviewRequest"(status);
CREATE INDEX idx_sir_token ON "StudentInterviewRequest"(token);

-- After interview: shared finish form → admin approves → Interview.status updated
CREATE TABLE "InterviewFinishRequest" (
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
CREATE INDEX idx_ifr_interview ON "InterviewFinishRequest"("interviewId");
CREATE INDEX idx_ifr_status ON "InterviewFinishRequest"(status);
CREATE INDEX idx_ifr_student ON "InterviewFinishRequest"("studentId");
