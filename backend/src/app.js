import { getSmtpHealth } from './config/nodemailer.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';
import { getGoogleChatBoardDiagnostics } from './jobs/googleChatBoard.job.js';

const app = express();

// Behind Render / nginx / Vercel proxies so rate limits use client IP.
if (process.env.TRUST_PROXY !== 'false') {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : Number(process.env.TRUST_PROXY) || 1);
}

function normalizeOrigin(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

function parseOrigins() {
  const chunks = [
    ...(process.env.CORS_ORIGIN || '').split(','),
    ...(process.env.FRONTEND_URL || '').split(','),
  ];
  const set = new Set();
  for (const chunk of chunks) {
    const normalized = normalizeOrigin(chunk);
    if (normalized) set.add(normalized);
  }
  // Safe defaults for local + known production domains.
  if (!set.size) {
    set.add('http://localhost:5173');
    set.add('http://localhost:5174');
    set.add('https://placetrack.urbancode.in');
    set.add('https://www.placetrack.urbancode.in');
  }
  // Browsers may use 127.0.0.1 while env lists localhost (or the reverse).
  for (const origin of [...set]) {
    if (origin.includes('://localhost')) {
      set.add(origin.replace('://localhost', '://127.0.0.1'));
    } else if (origin.includes('://127.0.0.1')) {
      set.add(origin.replace('://127.0.0.1', '://localhost'));
    }
  }
  return [...set];
}

function isOriginAllowed(requestOrigin, allowedOrigins) {
  const origin = normalizeOrigin(requestOrigin);
  if (!origin) return true; // non-browser tools like curl/Postman
  for (const rule of allowedOrigins) {
    if (rule === '*' || rule === origin) return true;
    // Supports wildcard patterns like https://*.urbancode.in
    if (rule.includes('*')) {
      const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(`^${escaped}$`);
      if (regex.test(origin)) return true;
    }
  }
  return false;
}

const allowedOrigins = parseOrigins();
const corsOptions = {
  credentials: true,
  optionsSuccessStatus: 204,
  origin(origin, callback) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

app.use('/api', routes);

app.get('/health', (_, res) => {
  const gc = getGoogleChatBoardDiagnostics();
  return res.json({
    success: true,
    message: 'PlaceTrack API OK',
    mail: getSmtpHealth(),
    googleChat: {
      /** @deprecated use webhookConfigured */
      configured: gc.webhookConfigured,
      webhookConfigured: gc.webhookConfigured,
      cronTimezone: gc.timezone,
      boardCron: gc.cronExpression,
      renderHost: gc.renderHost,
      disableInternalCronEnv: gc.disableInternalCronEnv,
      internalBoardCronDisabled: gc.internalBoardCronDisabled,
      externalCronSecretConfigured: gc.externalCronSecretConfigured,
    },
  });
});

app.use(errorHandler);

export { app };
