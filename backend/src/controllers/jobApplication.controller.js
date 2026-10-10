import { query } from '../config/db.js';
import { success, successWithPagination } from '../utils/response.utils.js';
import { getPaginationParams, buildPaginationResponse } from '../utils/pagination.utils.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  normalizePortalName,
  hydrateInterviewSlots,
  formatDateOnly,
  likeContainsPattern,
} from '../utils/jobApplication.utils.js';
import {
  normalizeSlotsFromClient,
  assertValidSlots,
  derivedSlotFields,
  enrichSlotsFromStudentSources,
} from '../services/jobApplicationSlots.service.js';
function mapPgClientError(err) {
  if (err?.code === '22008' || err?.code === '22007') {
    return new AppError('Invalid date', 400);
  }
  if (err?.code === '22003') {
    return new AppError('A numeric value is out of range', 400);
  }
  return null;
}

function normalizeInterviewIds(interviewIds, interviewId) {
  const fromArray = Array.isArray(interviewIds) ? interviewIds.filter(Boolean) : [];
  if (fromArray.length) return [...new Set(fromArray.map(String))];
  if (interviewId) return [String(interviewId)];
  return [];
}

function mapRow(row) {
  const interviewIds = normalizeInterviewIds(row.interviewIds, row.interviewId);
  let interviews = [];
  if (row.linked_interviews) {
    try {
      interviews = Array.isArray(row.linked_interviews)
        ? row.linked_interviews
        : JSON.parse(row.linked_interviews);
    } catch {
      interviews = [];
    }
  }

  const storedSlots = hydrateInterviewSlots(row.interviewSlots);
  const interviewSlots = storedSlots.length
    ? storedSlots
    : hydrateInterviewSlots(
        (row.interviewsScheduled > 0 && (row.companyName || row.interviewLink)
          ? [
              {
                id: row.id,
                companyName: row.companyName,
                date: formatDateOnly(row.date),
                timeSlot: '',
                meetingLink: row.interviewLink,
                interviewId: row.interviewId,
              },
            ]
          : [])
      );
  const firstReceived = interviewSlots.find((s) => s.meetingLink);

  return {
    id: row.id,
    date: formatDateOnly(row.date),
    spocUserId: row.spocUserId,
    studentId: row.studentId,
    portal: row.portal,
    applicationCount: row.applicationCount,
    callsReceived: row.callsReceived,
    interviewsScheduled: row.interviewsScheduled,
    companyName:
      row.companyName ||
      interviewSlots.map((s) => s.companyName).filter(Boolean).join(', ') ||
      null,
    interviewId: interviewIds[0] || row.interviewId || null,
    interviewIds,
    interviewSlots,
    interviewLink: firstReceived?.meetingLink || row.interviewLink || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    student: row.s_id
      ? { id: row.s_id, name: row.s_name, course: row.s_course }
      : undefined,
    spoc: row.spoc_name
      ? { id: row.spoc_id || null, name: row.spoc_name, role: row.spoc_role || null }
      : undefined,
    interview: interviews[0]
      ? {
          id: interviews[0].id,
          company: interviews[0].company,
          status: interviews[0].status,
        }
      : null,
    interviews,
  };
}

const SELECT_JOIN = `
  SELECT j.*,
    s.id as "s_id", s.name as "s_name", s.course as "s_course",
    u.id as "spoc_id", COALESCE(u.name, j."spocName") as "spoc_name", u.role as "spoc_role",
    (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', i2.id,
          'company', i2.company,
          'status', i2.status,
          'round', i2.round,
          'date', i2.date,
          'room', i2.room
        ) ORDER BY i2.date DESC NULLS LAST
      ), '[]'::json)
      FROM "Interview" i2
      WHERE i2.id = ANY(COALESCE(j."interviewIds", ARRAY[]::text[]))
         OR (cardinality(COALESCE(j."interviewIds", ARRAY[]::text[])) = 0 AND i2.id = j."interviewId")
    ) as linked_interviews
  FROM "JobApplicationDaily" j
  JOIN "Student" s ON s.id = j."studentId"
  LEFT JOIN "User" u ON u.id = j."spocUserId"
`;

async function assertSpocUser(spocUserId) {
  const r = await query(
    `SELECT id, name, role, allowed FROM "User"
     WHERE id = $1 AND role = 'TRAINER' AND allowed IS TRUE`,
    [spocUserId]
  );
  if (!r.rows[0]) throw new AppError('SPOC is not allowed', 400);
  return r.rows[0];
}

async function assertStudent(studentId) {
  const r = await query('SELECT id, name, course FROM "Student" WHERE id = $1', [studentId]);
  if (!r.rows[0]) throw new AppError('Student not found', 404);
  return r.rows[0];
}

async function resolveStudentForCreate(spocUserId, { studentId, studentName, course }) {
  if (studentId) {
    const entered = await query(
      `SELECT 1 FROM "JobApplicationDaily"
       WHERE "studentId" = $1 AND "spocUserId" = $2
       LIMIT 1`,
      [studentId, spocUserId]
    );
    if (!entered.rows[0]) throw new AppError('Enter a student name', 400);
    return assertStudent(studentId);
  }

  const name = String(studentName || '').trim();
  const found = await query(
    `SELECT id, name, course FROM "Student" WHERE LOWER(btrim(name)) = LOWER(btrim($1))`,
    [name]
  );
  if (found.rows.length > 1) {
    throw new AppError(`More than one student is named ${name}`, 409);
  }
  if (found.rows.length === 1) return found.rows[0];

  const inserted = await query(
    `INSERT INTO "Student" (name, course) VALUES ($1, $2) RETURNING id, name, course`,
    [name, course]
  );
  return inserted.rows[0];
}

async function prepareSlotsForWrite({
  studentId,
  interviewsScheduled,
  interviewSlots,
  existingSlots = [],
  entryDate,
}) {
  const count = Number(interviewsScheduled) || 0;
  if (count <= 0) return { slots: [], derived: derivedSlotFields([]) };

  const slots = assertValidSlots(
    normalizeSlotsFromClient(interviewSlots || [], { existingSlots, entryDate }),
    count
  );
  const enriched = await enrichSlotsFromStudentSources(studentId, slots);
  return { slots: enriched, derived: derivedSlotFields(enriched) };
}

function resolveSpocForWrite(req, requestedSpocUserId) {
  if (req.user.role === 'TRAINER') return req.user.id;
  if (!requestedSpocUserId) throw new AppError('Select an allowed SPOC', 400);
  return requestedSpocUserId;
}

async function findDuplicateEntry({ date, spocUserId, studentId, portal, excludeId }) {
  const vals = [date, spocUserId, studentId, portal];
  let sql = `SELECT id FROM "JobApplicationDaily"
    WHERE date = $1::date
      AND "spocUserId" = $2
      AND "studentId" = $3
      AND LOWER(btrim(portal)) = LOWER(btrim($4))`;
  if (excludeId) {
    vals.push(excludeId);
    sql += ` AND id <> $5`;
  }
  sql += ' LIMIT 1';
  const r = await query(sql, vals);
  return r.rows[0] || null;
}

function duplicateEntryError(existingId) {
  return new AppError(
    'An entry already exists for this date, SPOC, student, and portal. Edit that row instead of creating a duplicate.',
    409,
    { code: 'DUPLICATE_ENTRY', data: { id: existingId } }
  );
}

export async function listSpocs(req, res, next) {
  try {
    const withEntries =
      req.query.withEntries === '1' ||
      req.query.withEntries === 'true' ||
      req.query.withEntries === true;

    if (req.user.role === 'TRAINER') {
      const r = await query(
        `SELECT id, name, email, role FROM "User"
         WHERE id = $1 AND role = 'TRAINER' AND allowed IS TRUE`,
        [req.user.id]
      );
      return success(res, r.rows);
    }

    // SPOCs are mentor trainers (real names from Trainers), not ADMIN / role-placeholder accounts.
    if (withEntries) {
      const r = await query(
        `SELECT DISTINCT u.id, u.name, u.email, u.role
         FROM "JobApplicationDaily" j
         JOIN "User" u ON u.id = j."spocUserId"
         WHERE u.role = 'TRAINER'
         ORDER BY u.name ASC`
      );
      return success(res, r.rows);
    }

    const r = await query(
      `SELECT id, name, email, role FROM "User"
       WHERE role = 'TRAINER' AND allowed IS TRUE
       ORDER BY name ASC`
    );
    return success(res, r.rows);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}

export async function listStudents(req, res, next) {
  try {
    const vals = [];
    const clauses = [];
    const filters = req.validated || {};

    if (req.user.role === 'TRAINER') {
      vals.push(req.user.id);
      clauses.push(`j."spocUserId" = $${vals.length}`);
    } else if (filters.spocUserId) {
      vals.push(String(filters.spocUserId));
      clauses.push(`j."spocUserId" = $${vals.length}`);
    }

    if (filters.dateFrom) {
      vals.push(String(filters.dateFrom));
      clauses.push(`j.date >= $${vals.length}::date`);
    }
    if (filters.dateTo) {
      vals.push(String(filters.dateTo));
      clauses.push(`j.date <= $${vals.length}::date`);
    }

    const where = clauses.length ? clauses.join(' AND ') : '1=1';

    const r = await query(
      `SELECT DISTINCT s.id, s.name, s.course
       FROM "JobApplicationDaily" j
       JOIN "Student" s ON s.id = j."studentId"
       WHERE ${where}
       ORDER BY s.name ASC`,
      vals
    );
    return success(res, r.rows);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(mapPgClientError(err) || err);
  }
}

export async function listPortals(req, res, next) {
  try {
    const r = await query(
      `SELECT MIN(portal) as portal
       FROM "JobApplicationDaily"
       WHERE portal IS NOT NULL AND btrim(portal) <> ''
       GROUP BY LOWER(btrim(portal))
       ORDER BY MIN(portal) ASC`
    );
    return success(
      res,
      r.rows.map((row) => normalizePortalName(row.portal) || row.portal)
    );
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}

export async function getDaily(req, res, next) {
  try {
    const { date, spocUserId: requestedSpoc } = req.validated;
    const isTrainer = req.user.role === 'TRAINER';
    const spocUserId = isTrainer ? req.user.id : requestedSpoc || null;
    const spoc = spocUserId ? await assertSpocUser(spocUserId) : null;

    const params = [date];
    let where = 'j.date = $1::date';
    if (spocUserId) {
      params.push(spocUserId);
      where += ` AND j."spocUserId" = $${params.length}`;
    }

    const r = await query(
      `${SELECT_JOIN}
       WHERE ${where}
       ORDER BY s.name ASC, j.portal ASC`,
      params
    );

    const rows = r.rows.map(mapRow);
    const totals = rows.reduce(
      (acc, row) => {
        acc.applicationCount += row.applicationCount || 0;
        acc.callsReceived += row.callsReceived || 0;
        acc.interviewsScheduled += row.interviewsScheduled || 0;
        return acc;
      },
      { applicationCount: 0, callsReceived: 0, interviewsScheduled: 0 }
    );

    return success(res, {
      date,
      spocUserId,
      spoc: spoc ? { id: spoc.id, name: spoc.name, role: spoc.role } : null,
      rows,
      totals,
    });
  } catch (err) {
    if (err.code === '42P01') {
      return success(res, {
        date: req.validated.date,
        spocUserId: req.user.id,
        spoc: { id: req.user.id, name: req.user.name || null, role: req.user.role },
        rows: [],
        totals: { applicationCount: 0, callsReceived: 0, interviewsScheduled: 0 },
      });
    }
    next(mapPgClientError(err) || err);
  }
}

export async function listHistory(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const {
      dateFrom,
      dateTo,
      spocUserId,
      studentId,
      course,
      portal,
      search,
    } = req.validated || {};

    const conds = ['1=1'];
    const vals = [];
    let idx = 1;

    if (req.user.role === 'TRAINER') {
      conds.push(`j."spocUserId" = $${idx++}`);
      vals.push(req.user.id);
    } else if (spocUserId) {
      conds.push(`j."spocUserId" = $${idx++}`);
      vals.push(spocUserId);
    }

    if (dateFrom) {
      conds.push(`j.date >= $${idx++}::date`);
      vals.push(dateFrom);
    }
    if (dateTo) {
      conds.push(`j.date <= $${idx++}::date`);
      vals.push(dateTo);
    }
    if (studentId) {
      conds.push(`j."studentId" = $${idx++}`);
      vals.push(studentId);
    }
    if (course) {
      conds.push(`s.course = $${idx++}`);
      vals.push(course);
    }
    if (portal) {
      conds.push(`LOWER(btrim(j.portal)) = LOWER(btrim($${idx++}))`);
      vals.push(portal);
    }
    if (search) {
      const term = likeContainsPattern(String(search).trim());
      conds.push(
        `(s.name ILIKE $${idx} ESCAPE E'\\\\' OR j.portal ILIKE $${idx} ESCAPE E'\\\\' OR COALESCE(j."companyName", '') ILIKE $${idx} ESCAPE E'\\\\' OR COALESCE(u.name, j."spocName", '') ILIKE $${idx} ESCAPE E'\\\\')`
      );
      vals.push(term);
      idx++;
    }

    const whereSql = conds.join(' AND ');

    const countR = await query(
      `SELECT
         COUNT(*)::int as total,
         COALESCE(SUM(j."applicationCount"), 0)::int as "applicationCount",
         COALESCE(SUM(j."callsReceived"), 0)::int as "callsReceived",
         COALESCE(SUM(j."interviewsScheduled"), 0)::int as "interviewsScheduled"
       FROM "JobApplicationDaily" j
       JOIN "Student" s ON s.id = j."studentId"
       LEFT JOIN "User" u ON u.id = j."spocUserId"
       WHERE ${whereSql}`,
      vals
    );
    const total = countR.rows[0]?.total || 0;
    const totals = {
      applicationCount: countR.rows[0]?.applicationCount || 0,
      callsReceived: countR.rows[0]?.callsReceived || 0,
      interviewsScheduled: countR.rows[0]?.interviewsScheduled || 0,
    };

    const r = await query(
      `${SELECT_JOIN}
       WHERE ${whereSql}
       ORDER BY j.date DESC, s.name ASC, j.portal ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, skip]
    );

    const pagination = buildPaginationResponse(total, page, limit);
    return successWithPagination(res, r.rows.map(mapRow), pagination, 'Success', { totals });
  } catch (err) {
    if (err.code === '42P01') {
      const { page, limit } = getPaginationParams(req.query);
      return successWithPagination(res, [], buildPaginationResponse(0, page, limit), 'Success', {
        totals: { applicationCount: 0, callsReceived: 0, interviewsScheduled: 0 },
      });
    }
    next(mapPgClientError(err) || err);
  }
}

export async function create(req, res, next) {
  try {
    const data = req.validated;
    const spocUserId = resolveSpocForWrite(req, data.spocUserId);

    const spoc = await assertSpocUser(spocUserId);
    const student = await resolveStudentForCreate(spocUserId, data);

    const portal = normalizePortalName(data.portal);
    const interviewsScheduled = data.interviewsScheduled ?? 0;
    const { slots, derived } = await prepareSlotsForWrite({
      studentId: student.id,
      interviewsScheduled,
      interviewSlots: data.interviewSlots,
      entryDate: data.date,
    });

    const duplicate = await findDuplicateEntry({
      date: data.date,
      spocUserId,
      studentId: student.id,
      portal,
    });
    if (duplicate) throw duplicateEntryError(duplicate.id);

    const r = await query(
      `INSERT INTO "JobApplicationDaily"
        (date, "spocUserId", "spocName", "studentId", portal, "applicationCount", "callsReceived",
         "interviewsScheduled", "companyName", "interviewId", "interviewIds", "interviewLink",
         "interviewSlots")
       VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[], $12, $13::jsonb)
       RETURNING id`,
      [
        data.date,
        spocUserId,
        spoc.name,
        student.id,
        portal,
        data.applicationCount,
        data.callsReceived ?? 0,
        interviewsScheduled,
        derived.companyName,
        derived.interviewId,
        derived.interviewIds,
        derived.interviewLink,
        JSON.stringify(slots),
      ]
    );

    const full = await query(`${SELECT_JOIN} WHERE j.id = $1`, [r.rows[0].id]);
    return success(res, mapRow(full.rows[0]), 'Job application entry saved', 201);
  } catch (err) {
    if (err.code === '23505') {
      return next(
        duplicateEntryError(null)
      );
    }
    if (err.code === '42P01') {
      return next(
        new AppError(
          'Job application table missing — run npm run db:migrate-job-applications',
          503
        )
      );
    }
    next(mapPgClientError(err) || err);
  }
}

export async function update(req, res, next) {
  try {
    const { id, ...data } = req.validated;

    const existingR = await query('SELECT * FROM "JobApplicationDaily" WHERE id = $1', [id]);
    const existing = existingR.rows[0];
    if (!existing) throw new AppError('Job application entry not found', 404);

    const existingSpocId = String(existing.spocUserId || '');
    if (req.user.role === 'TRAINER' && existingSpocId !== String(req.user.id)) {
      throw new AppError('Access denied', 403);
    }

    const nextStudentId = data.studentId ?? existing.studentId;
    const nextSpocUserId =
      req.user.role === 'TRAINER'
        ? req.user.id
        : data.spocUserId ?? existing.spocUserId;
    const nextDate = data.date ?? formatDateOnly(existing.date);
    const nextPortal =
      data.portal != null ? normalizePortalName(data.portal) : existing.portal;
    const nextAppCount =
      data.applicationCount !== undefined ? data.applicationCount : existing.applicationCount;
    const nextCalls =
      data.callsReceived !== undefined ? data.callsReceived : existing.callsReceived;
    const nextInterviews =
      data.interviewsScheduled !== undefined
        ? data.interviewsScheduled
        : data.interviewSlots != null
          ? data.interviewSlots.length
          : existing.interviewsScheduled;

    const sameStudent = String(nextStudentId) === String(existing.studentId);
    await assertStudent(nextStudentId);
    if (!sameStudent) {
      const entered = await query(
        `SELECT 1 FROM "JobApplicationDaily"
         WHERE "studentId" = $1 AND "spocUserId" = $2
         LIMIT 1`,
        [nextStudentId, nextSpocUserId]
      );
      if (!entered.rows[0]) throw new AppError('Enter a student name', 400);
    }
    let nextSpocName = existing.spocName || null;
    if (data.spocUserId || req.user.role === 'TRAINER') {
      const spoc = await assertSpocUser(nextSpocUserId);
      nextSpocName = spoc.name;
    } else if (nextSpocUserId) {
      const named = await query('SELECT name FROM "User" WHERE id = $1', [nextSpocUserId]);
      nextSpocName = named.rows[0]?.name || nextSpocName;
    }

    const slotsChanged =
      data.interviewSlots != null || data.interviewsScheduled !== undefined;
    const { slots, derived } = slotsChanged
      ? await prepareSlotsForWrite({
          studentId: nextStudentId,
          interviewsScheduled: nextInterviews,
          interviewSlots:
            nextInterviews <= 0
              ? []
              : data.interviewSlots != null
                ? data.interviewSlots
                : hydrateInterviewSlots(existing.interviewSlots),
          existingSlots: hydrateInterviewSlots(existing.interviewSlots),
          entryDate: nextDate,
        })
      : {
          slots: hydrateInterviewSlots(existing.interviewSlots).map((s) => ({
            id: s.id,
            companyName: s.companyName,
            date: s.date,
            timeSlot: s.timeSlot,
            meetingLink: s.meetingLink,
            interviewId: s.interviewId,
          })),
          derived: {
            companyName: existing.companyName,
            interviewId: existing.interviewId,
            interviewIds: existing.interviewIds || [],
            interviewLink: existing.interviewLink,
          },
        };

    const duplicate = await findDuplicateEntry({
      date: nextDate,
      spocUserId: nextSpocUserId,
      studentId: nextStudentId,
      portal: nextPortal,
      excludeId: id,
    });
    if (duplicate) throw duplicateEntryError(duplicate.id);

    const r = await query(
      `UPDATE "JobApplicationDaily" SET
         date = $1::date,
         "spocUserId" = $2,
         "spocName" = $3,
         "studentId" = $4,
         portal = $5,
         "applicationCount" = $6,
         "callsReceived" = $7,
         "interviewsScheduled" = $8,
         "companyName" = $9,
         "interviewId" = $10,
         "interviewIds" = $11::text[],
         "interviewLink" = $12,
         "interviewSlots" = $13::jsonb,
         "updatedAt" = now()
       WHERE id = $14
       RETURNING id`,
      [
        nextDate,
        nextSpocUserId,
        nextSpocName,
        nextStudentId,
        nextPortal,
        nextAppCount,
        nextCalls,
        nextInterviews,
        derived.companyName,
        derived.interviewId,
        derived.interviewIds,
        derived.interviewLink,
        JSON.stringify(slots),
        id,
      ]
    );

    if (!r.rows[0]) throw new AppError('Job application entry not found', 404);

    const full = await query(`${SELECT_JOIN} WHERE j.id = $1`, [id]);
    if (!full.rows[0]) throw new AppError('Job application entry not found', 404);
    return success(res, mapRow(full.rows[0]), 'Job application entry updated');
  } catch (err) {
    if (err.statusCode || err instanceof AppError) return next(err);
    if (err.code === '23505') {
      return next(duplicateEntryError(null));
    }
    next(mapPgClientError(err) || err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.validated;
    const existingR = await query('SELECT * FROM "JobApplicationDaily" WHERE id = $1', [id]);
    const existing = existingR.rows[0];
    if (!existing) throw new AppError('Job application entry not found', 404);

    const existingSpocId = String(existing.spocUserId || '');
    if (req.user.role === 'TRAINER' && existingSpocId !== String(req.user.id)) {
      throw new AppError('Access denied', 403);
    }

    await query('DELETE FROM "JobApplicationDaily" WHERE id = $1', [id]);
    return success(res, null, 'Job application entry deleted');
  } catch (err) {
    next(err);
  }
}
