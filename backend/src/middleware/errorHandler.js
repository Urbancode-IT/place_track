function getDatabaseNameFromUrl() {
  try {
    const raw = process.env.DATABASE_URL || '';
    if (!raw) return null;
    const url = new URL(raw);
    const dbName = (url.pathname || '').replace(/^\/+/, '');
    return dbName || null;
  } catch {
    return null;
  }
}

function mapDbError(err) {
  const code = err?.code;
  const dbName = getDatabaseNameFromUrl();
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    return {
      status: 503,
      message:
        'Database unreachable — check PostgreSQL availability and DATABASE_URL in backend/.env.',
    };
  }
  if (code === '28P01') {
    return { status: 503, message: 'Database login failed — check username/password in DATABASE_URL.' };
  }
  if (code === '3D000') {
    return {
      status: 503,
      message: dbName
        ? `Database "${dbName}" does not exist. Create it (or update DATABASE_URL to an existing DB).`
        : 'Database does not exist. Create it (or update DATABASE_URL to an existing DB).',
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
