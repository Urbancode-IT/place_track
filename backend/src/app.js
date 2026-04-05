import { getSmtpHealth } from './config/nodemailer.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';

const app = express();

function getAllowedOrigins() {
  const raw =
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}));
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
  })
);

app.use(errorHandler);

export { app };
