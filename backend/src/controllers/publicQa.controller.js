import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import { topicsForCourse } from '../constants/interviewQaTopics.js';

async function resolveStudentByEmail(studentEmail) {
  const norm = studentEmail.trim().toLowerCase();
  const dup = await query(
    `SELECT id, name, course, email FROM "Student"
     WHERE email IS NOT NULL AND LOWER(TRIM(email)) = $1
     LIMIT 2`,
    [norm]
  );
  if (dup.rows.length === 0) {
    throw new AppError('No student found with this email. Use the same email as in your profile.', 404);
  }
  if (dup.rows.length > 1) {
    throw new AppError('Multiple profiles use this email. Contact placement.', 400);
  }
  return dup.rows[0];
}

/** Prefill topics from student course (FSD → Frontend/Backend/DB, etc.). */
export async function getPublicQaMeta(req, res, next) {
  try {
    const { studentEmail } = req.validated;
    const student = await resolveStudentByEmail(studentEmail);
    const topics = topicsForCourse(student.course);
    return success(res, {
      studentName: student.name,
      course: student.course,
      topics,
    });
  } catch (err) {
    next(err);
  }
}

/** Student public form — save interview Q&A into their QA bank (PENDING). */
export async function submitPublicQa(req, res, next) {
  try {
    const { studentEmail, company, topic, question, answer } = req.validated;
    const student = await resolveStudentByEmail(studentEmail);
    const companyPart = company?.trim() ? company.trim() : 'Interview';
    const category = `${companyPart} · ${topic}`;

    const r = await query(
      `INSERT INTO "QAEntry" ("studentId", question, answer, category, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id, question, category, status, "createdAt"`,
      [student.id, question.trim(), answer?.trim() || null, category]
    );

    return success(
      res,
      { entry: r.rows[0], studentName: student.name, course: student.course },
      'Question saved. You can add more if needed.',
      201
    );
  } catch (err) {
    next(err);
  }
}
