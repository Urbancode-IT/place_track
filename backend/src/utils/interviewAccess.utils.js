import { AppError } from '../middleware/errorHandler.js';

/** Admitted trainers and admins can open any interview. */
export async function assertCanAccessInterview(user) {
  if (!user) throw new AppError('Unauthorized', 401);
  if (user.role === 'ADMIN' || user.role === 'TRAINER') return;
  throw new AppError('Access denied', 403);
}

/** Admitted trainers and admins can open any student. */
export async function assertCanAccessStudent(user) {
  if (!user) throw new AppError('Unauthorized', 401);
  if (user.role === 'ADMIN' || user.role === 'TRAINER') return;
  throw new AppError('Access denied', 403);
}
