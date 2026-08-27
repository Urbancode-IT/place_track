import jwt from 'jsonwebtoken';

function requireSecret(name, value) {
  const v = typeof value === 'string' ? value.trim() : '';
  const weak = new Set([
    'fallback-secret',
    'fallback-refresh',
    'your_jwt_secret_here',
    'your_refresh_secret_here',
    'changeme',
    'secret',
  ]);
  if (!v || weak.has(v.toLowerCase()) || v.length < 16) {
    throw new Error(
      `${name} must be set in the environment to a strong value (min 16 chars, not a placeholder). Refusing to start with a weak/default secret.`
    );
  }
  return v;
}

const isTest = process.env.NODE_ENV === 'test';

const JWT_SECRET = isTest
  ? process.env.JWT_SECRET || 'test-jwt-secret-min-16'
  : requireSecret('JWT_SECRET', process.env.JWT_SECRET);
const JWT_REFRESH = isTest
  ? process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-min-16'
  : requireSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
const ACCESS_EXP = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXP = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXP });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH, { expiresIn: REFRESH_EXP });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH);
}
