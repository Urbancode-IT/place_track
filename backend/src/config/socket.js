import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.utils.js';

let io = null;

function getAllowedOrigins() {
  const raw =
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173';
  const set = new Set(
    raw
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean)
  );
  for (const origin of [...set]) {
    if (origin.includes('://localhost')) {
      set.add(origin.replace('://localhost', '://127.0.0.1'));
    } else if (origin.includes('://127.0.0.1')) {
      set.add(origin.replace('://127.0.0.1', '://localhost'));
    }
  }
  return [...set];
}

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (socket.role === 'ADMIN') socket.join('admin');
    if (socket.role === 'TRAINER') socket.join('trainers');
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket not initialized');
  return io;
}
