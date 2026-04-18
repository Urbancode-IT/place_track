import rateLimit from 'express-rate-limit';

const skipPreflight = (req) => req.method === 'OPTIONS';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts' },
  skip: skipPreflight,
});
