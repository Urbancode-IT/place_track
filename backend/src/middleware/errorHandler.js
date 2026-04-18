function mapDbError(err) {
  const code = err?.code;
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    return {
      status: 503,
      message:
        'Database unreachable — start PostgreSQL and check DATABASE_URL / DB_* in backend/.env.',
    };
  }
  if (code === '28P01') {
    return { status: 503, message: 'Database login failed — check DB_USER / DB_PASSWORD in backend/.env.' };
  }
  if (code === '3D000') {
    return {
      status: 503,
      message: 'Database does not exist — create it in pgAdmin (e.g. Placement_Tracking) and run schema.sql.',
    };
  }
  if (code === '42P01') {
    return {
      status: 503,
      message: 'Database tables missing — run backend/scripts/schema.sql on your database.',
    };
  }
  return null;
}

export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  const mapped = mapDbError(err);
  if (mapped) {
    status = mapped.status;
    message = mapped.message;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
  });
}

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
  }
}
