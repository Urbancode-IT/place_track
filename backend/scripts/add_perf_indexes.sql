-- Run once in pgAdmin for faster lists, filters, and dashboard queries.
CREATE INDEX IF NOT EXISTS idx_interview_student_date ON "Interview"("studentId", date DESC);
CREATE INDEX IF NOT EXISTS idx_interview_status ON "Interview"(status);
CREATE INDEX IF NOT EXISTS idx_interview_date_status ON "Interview"(date, status);
CREATE INDEX IF NOT EXISTS idx_student_course ON "Student"(course);
CREATE INDEX IF NOT EXISTS idx_student_name_lower ON "Student"(lower(name));
CREATE INDEX IF NOT EXISTS idx_interview_trainer_interview ON "InterviewTrainer"("interviewId");
