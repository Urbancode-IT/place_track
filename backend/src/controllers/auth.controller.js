import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utils.js';
import { AppError } from '../middleware/errorHandler.js';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
}

function issueTokens(user) {
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  return { accessToken, refreshToken };
}

export async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.validated;
    const existing = await query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (existing.rows.length) throw new AppError('Email already registered', 400);
    const hashed = await bcrypt.hash(password, 10);
    // Public register always creates TRAINER — never trust client role.
    const r = await query(
      'INSERT INTO "User" (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone, "createdAt"',
      [name, email, hashed, 'TRAINER', phone || null]
    );
    const user = r.rows[0];
    const { accessToken, refreshToken } = issueTokens(user);
    setRefreshCookie(res, refreshToken);
    return success(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt,
        },
        accessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      },
      'Registered successfully',
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validated;
    const r = await query('SELECT id, name, email, password, role, phone FROM "User" WHERE email = $1', [
      email,
    ]);
    const user = r.rows[0];
    if (!user) throw new AppError('Invalid credentials', 401);
    const valid = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!valid) throw new AppError('Invalid credentials', 401);
    const { accessToken, refreshToken } = issueTokens(user);
    setRefreshCookie(res, refreshToken);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    };
    return success(res, {
      user: safeUser,
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const opts = refreshCookieOptions();
    res.clearCookie('refreshToken', {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
    });
    return success(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token = req.validated?.refreshToken ?? req.cookies?.refreshToken;
    if (!token?.trim()) throw new AppError('Refresh token required', 401);
    const decoded = verifyRefreshToken(token);
    const r = await query('SELECT id, email, role FROM "User" WHERE id = $1', [decoded.userId]);
    const user = r.rows[0];
    if (!user) throw new AppError('User not found', 401);
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    return success(res, { accessToken, expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const r = await query('SELECT id, name, email, role, phone, "createdAt" FROM "User" WHERE id = $1', [
      req.user.id,
    ]);
    const user = r.rows[0];
    if (!user) throw new AppError('User not found', 404);
    return success(res, user);
  } catch (err) {
    next(err);
  }
}
