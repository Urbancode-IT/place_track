import { query } from '../config/db.js';
import { uploadResume, uploadPhoto } from '../services/upload.service.js';
import { success } from '../utils/response.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export async function uploadResumeHandler(req, res, next) {
  try {
    if (!req.file?.path) throw new AppError('No file uploaded', 400);
    const url = await uploadResume(req.file.path);
    const studentId = req.body?.studentId || req.params?.id;
    if (studentId) {
      await query('UPDATE "Student" SET "resumeUrl" = $1, "updatedAt" = now() WHERE id = $2', [url, studentId]);
    }
    return success(res, { url, studentId: studentId || null });
  } catch (err) {
    next(err);
  }
}

export async function uploadPhotoHandler(req, res, next) {
  try {
    if (!req.file?.path) throw new AppError('No file uploaded', 400);
    const url = await uploadPhoto(req.file.path);
    const studentId = req.body?.studentId;
    if (studentId) {
      await query('UPDATE "Student" SET "photoUrl" = $1, "updatedAt" = now() WHERE id = $2', [url, studentId]);
    }
    return success(res, { url, studentId: studentId || null });
  } catch (err) {
    next(err);
  }
}
