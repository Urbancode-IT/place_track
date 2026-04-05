import { getIO } from '../config/socket.js';

export function emitToAdmin(event, data) {
  const io = getIO();
  io.to('admin').emit(event, data);
}

export function emitToUser(userId, event, data) {
  const io = getIO();
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToAll(event, data) {
  const io = getIO();
  io.emit(event, data);
}

export function emitInterviewUpdated(interview) {
  emitToAdmin('interview:updated', interview);
  if (interview.trainers) {
    for (const t of interview.trainers) {
      emitToUser(t.trainerId, 'interview:updated', interview);
    }
  }
}

export function emitNewInterview(interview) {
  emitToAdmin('interview:created', interview);
  if (interview.trainers) {
    for (const t of interview.trainers) {
      emitToUser(t.trainerId, 'interview:assigned', interview);
    }
  }
}
