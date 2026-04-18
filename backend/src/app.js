import { getSmtpHealth } from './config/nodemailer.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';

const app = express();

function normalizeOrigin(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

/** Merge CORS_ORIGIN + FRONTEND_URL (comma lists) so production domain is never missed. */
function getAllowedOrigins() {
  const chunks = [
    ...(process.env.CORS_ORIGIN || '').split(','),
    ...(process.env.FRONTEND_URL || '').split(','),
  ];
  const set = new Set();
  for (const c of chunks) {
    const n = normalizeOrigin(c);
    if (n) set.add(n);
  }
  if (!set.size) set.add('http://localhost:5173');
  return [...set];
}

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

app.use('/api', routes);

app.get('/health', (_, res) =>
  res.json({
    success: true,
    message: 'PlaceTrack API OK',
    mail: getSmtpHealth(),
    googleChat: {
      configured: Boolean(process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim()),
      cronTimezone:
        process.env.GOOGLE_CHAT_CRON_TZ ||
        process.env.INTERVIEW_SCHEDULE_TZ ||
        'Asia/Kolkata',
    },
  })
);

app.use(errorHandler);

export { app };
