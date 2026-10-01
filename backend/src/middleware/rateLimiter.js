import rateLimit from 'express-rate-limit';

const skipPreflight = (req) => req.method === 'OPTIONS';
const skipInTests = (req) => skipPreflight(req) || process.env.NODE_ENV === 'test';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many auth attempts' },
  skip: skipInTests,
});
