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
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH'
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      status: 503,
      message: isProd
        ? 'Database connection timed out. On Render, use Render PostgreSQL or a cloud DB (Neon/Supabase) in DATABASE_URL — a VPS DB must allow remote connections on the correct port and firewall.'
        : 'Database unreachable — check PostgreSQL is running and DATABASE_URL in backend/.env.',
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

  const isJwtError =
    err?.name === 'TokenExpiredError' ||
    err?.name === 'JsonWebTokenError' ||
    err?.name === 'NotBeforeError';
  if (isJwtError) {
    status = 401;
    message = 'Invalid or expired token';
  }

  if (process.env.NODE_ENV === 'development' && !isJwtError) {
    console.error(err);
  }

  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage =
    isProd && status >= 500 && !mapped
      ? 'Something went wrong. Please try again later.'
      : message;

  res.status(status).json({
    success: false,
    message: safeMessage,
    ...(err.code ? { code: err.code } : {}),
    ...(err.data !== undefined ? { data: err.data } : {}),
    ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
  });
}

export class AppError extends Error {
  constructor(message, statusCode = 500, extras = {}) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    if (extras.code) this.code = extras.code;
    if (extras.data !== undefined) this.data = extras.data;
  }
}
