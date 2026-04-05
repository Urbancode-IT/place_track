import { success } from '../utils/response.utils.js';
import { upsertUserDeviceToken, removeUserDeviceToken } from '../services/push.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function registerToken(req, res, next) {
  try {
    const { token, platform = 'web' } = req.body || {};
    if (!token) throw new AppError('token required', 400);
    await upsertUserDeviceToken(req.user.id, token, platform);
    return success(res, null, 'Token registered');
  } catch (err) {
    next(err);
  }
}

export async function unregisterToken(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) throw new AppError('token required', 400);
    await removeUserDeviceToken(req.user.id, token);
    return success(res, null, 'Token removed');
  } catch (err) {
    next(err);
  }
}

