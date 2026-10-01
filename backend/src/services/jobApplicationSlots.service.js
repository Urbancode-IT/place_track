import { randomUUID } from 'crypto';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  normalizeMeetingLink,
  hydrateInterviewSlots,
  findDuplicateSlotTime,
  findMatchingSlotIndex,
  formatDateOnly,
  isValidHttpUrl,
} from '../utils/jobApplication.utils.js';

function newSlotId() {
  return randomUUID();
}

export function normalizeSlotsFromClient(incoming = [], { existingSlots = [], entryDate } = {}) {
  const existingById = new Map(
    hydrateInterviewSlots(existingSlots)
      .filter((s) => s.id)
      .map((s) => [String(s.id), s])
  );

  return incoming.map((raw) => {
    const prev = raw?.id ? existingById.get(String(raw.id)) : null;
    const companyName = String(raw?.companyName || '').trim();
    const date = formatDateOnly(raw?.date) || entryDate || '';
    const timeSlot = String(raw?.timeSlot || '').trim();
    return {
      id: raw?.id || prev?.id || newSlotId(),
      companyName,
      date,
      timeSlot,
      meetingLink: prev?.meetingLink || null,
      interviewId: prev?.interviewId || null,
    };
  });
}

export function assertValidSlots(slots, interviewsScheduled) {
  const count = Number(interviewsScheduled) || 0;
  if (count <= 0) {
    return [];
  }
  if (!Array.isArray(slots) || slots.length !== count) {
    throw new AppError(
      `Add ${count} interview slot${count === 1 ? '' : 's'} (company, date, and time)`,
      400
    );
  }
  slots.forEach((slot, index) => {
    if (!slot.companyName) {
      throw new AppError(`Company is required for interview ${index + 1}`, 400);
    }
    if (!slot.date) {
      throw new AppError(`Date is required for interview ${index + 1}`, 400);
    }
    if (!slot.timeSlot) {
      throw new AppError(`Time is required for interview ${index + 1}`, 400);
    }
  });
  const dup = findDuplicateSlotTime(slots);
  if (dup) {
    throw new AppError(
      'Two interviews on the same day need different times',
      400
    );
  }
  return slots;
}

export function derivedSlotFields(slots) {
  const hydrated = hydrateInterviewSlots(slots);
  const ids = [
    ...new Set(hydrated.map((s) => s.interviewId).filter(Boolean).map(String)),
  ];
  const companyName = [
    ...new Set(hydrated.map((s) => s.companyName).filter(Boolean)),
  ].join(', ');
  const firstLink = hydrated.find((s) => s.meetingLink)?.meetingLink || null;
  return {
    companyName: companyName || null,
    interviewIds: ids,
    interviewId: ids[0] || null,
    interviewLink: firstLink,
  };
}

async function writeSlots(entryId, slots) {
  const derived = derivedSlotFields(slots);
  await query(
    `UPDATE "JobApplicationDaily" SET
       "interviewSlots" = $1::jsonb,
       "companyName" = $2,
       "interviewId" = $3,
       "interviewIds" = $4::text[],
       "interviewLink" = $5,
       "updatedAt" = now()
     WHERE id = $6`,
    [
      JSON.stringify(slots),
      derived.companyName,
      derived.interviewId,
      derived.interviewIds,
      derived.interviewLink,
      entryId,
    ]
  );
}

export async function attachStudentMeetingLink({
  studentId,
  company,
  date,
  timeSlot,
  meetingLink,
  interviewId,
}) {
  const link = normalizeMeetingLink(meetingLink);
  if (!studentId || (!link && !interviewId)) return 0;
  if (link && !isValidHttpUrl(link)) return 0;

  try {
    const rows = await query(
      `SELECT id, "interviewSlots"
       FROM "JobApplicationDaily"
       WHERE "studentId" = $1 AND "interviewsScheduled" > 0`,
      [studentId]
    );

    let updated = 0;
    for (const row of rows.rows) {
      const slots = hydrateInterviewSlots(row.interviewSlots).map((s) => ({
        id: s.id || newSlotId(),
        companyName: s.companyName,
        date: s.date,
        timeSlot: s.timeSlot,
        meetingLink: s.meetingLink,
        interviewId: s.interviewId,
      }));
      const idx = findMatchingSlotIndex(slots, { company, date, timeSlot });
      if (idx < 0) continue;
      if (link) slots[idx].meetingLink = link;
      if (interviewId) slots[idx].interviewId = interviewId;
      await writeSlots(row.id, slots);
      updated += 1;
    }
    return updated;
  } catch (err) {
    if (err.code === '42703' || err.code === '42P01') return 0;
    throw err;
  }
}

export async function enrichSlotsFromStudentSources(studentId, slots) {
  const pending = slots.filter((s) => !s.meetingLink);
  if (!studentId || !pending.length) return slots;

  try {
    const reqs = await query(
    `SELECT company, date, "timeSlot", room, "resultingInterviewId"
     FROM "StudentInterviewRequest"
     WHERE "studentId" = $1
       AND status IN ('SUBMITTED', 'APPROVED')
       AND room IS NOT NULL AND btrim(room) <> ''
     ORDER BY "submittedAt" DESC NULLS LAST
     LIMIT 40`,
    [studentId]
  );

  const interviews = await query(
    `SELECT id, company, date, "timeSlot", room
     FROM "Interview"
     WHERE "studentId" = $1
       AND room IS NOT NULL AND btrim(room) <> ''
     ORDER BY date DESC
     LIMIT 40`,
    [studentId]
  );

  const sources = [
    ...reqs.rows.map((r) => ({
      company: r.company,
      date: formatDateOnly(r.date),
      timeSlot: r.timeSlot,
      meetingLink: r.room,
      interviewId: r.resultingInterviewId || null,
    })),
    ...interviews.rows.map((r) => ({
      company: r.company,
      date: formatDateOnly(r.date),
      timeSlot: r.timeSlot,
      meetingLink: r.room,
      interviewId: r.id,
    })),
  ];

  const next = slots.map((s) => ({ ...s }));
  for (const source of sources) {
    const link = normalizeMeetingLink(source.meetingLink);
    if (!link || !isValidHttpUrl(link)) continue;
    const idx = findMatchingSlotIndex(next, source);
    if (idx < 0) continue;
    if (!next[idx].meetingLink) next[idx].meetingLink = link;
    if (!next[idx].interviewId && source.interviewId) {
      next[idx].interviewId = source.interviewId;
    }
  }
  return next;
  } catch (err) {
    if (err.code === '42703' || err.code === '42P01') return slots;
    throw err;
  }
}
