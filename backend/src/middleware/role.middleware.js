import { AppError } from './errorHandler.js';

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') {
    return next(new AppError('Admin access required', 403));
  }
  next();
}

export function requireTrainerOrAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'TRAINER') {
    return next(new AppError('Access denied', 403));
  }
  next();
}
