import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from '../utils/date.utils.js';
import { getInterviewStartAt } from '../utils/interviewStartAt.utils.js';

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function parseDateOnly(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const local = new Date(y, mo, d);
  return Number.isNaN(local.getTime()) ? null : local;
}

export async function getPendingSelfSubmits(req, res, next) {
  try {
    const r = await query(
      'SELECT COUNT(*)::int as c FROM "StudentInterviewRequest" WHERE status = $1',
      ['SUBMITTED']
    );
    return success(res, { count: r.rows[0]?.c ?? 0 });
  } catch (err) {
    if (err.code === '42P01') return success(res, { count: 0 });
    next(err);
  }
}

export async function getPendingInterviewFinishes(req, res, next) {
  try {
    const r = await query(
      'SELECT COUNT(*)::int as c FROM "InterviewFinishRequest" WHERE status = $1',
      ['SUBMITTED']
    );
    return success(res, { count: r.rows[0]?.c ?? 0 });
  } catch (err) {
    if (err.code === '42P01') return success(res, { count: 0 });
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const r = await query(
      `SELECT 
        (SELECT COUNT(*)::int FROM "Student") as total_students,
        (SELECT COUNT(*)::int FROM "Interview" WHERE date >= $1 AND date <= $2 AND status != $3) as today_interviews,
        (SELECT COUNT(*)::int FROM "Interview" WHERE status = $4) as shortlisted,
        (SELECT COUNT(*)::int FROM "Interview" WHERE status = $5 AND date >= $6 AND date <= $7) as placed_this_month`,
      [todayStart, todayEnd, 'REJECTED', 'SHORTLISTED', 'SELECTED', monthStart, monthEnd]
    );

    const stats = r.rows[0] || {};
    return success(res, {
      totalStudents: stats.total_students ?? 0,
      todayInterviews: stats.today_interviews ?? 0,
      shortlisted: stats.shortlisted ?? 0,
      placedThisMonth: stats.placed_this_month ?? 0,
    });
  } catch (err) {
    if (err.code === '42P01') {
      return success(res, {
        totalStudents: 0,
        todayInterviews: 0,
        shortlisted: 0,
        placedThisMonth: 0,
      });
    }
    next(err);
  }
}

export async function getToday(req, res, next) {
  try {
    const parsedDate = parseDateOnly(req.query?.date);
    const baseDate = parsedDate || (req.query?.date ? new Date(req.query.date) : new Date());
    const safeBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const todayStart = startOfDay(safeBaseDate);
    const todayEnd = endOfDay(safeBaseDate);
    let sql = `SELECT i.*, s.id as "s_id", s.name as "s_name", s.course as "s_course" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.date >= $1 AND i.date <= $2`;
    const vals = [todayStart, todayEnd];
    if (req.user.role === 'TRAINER') {
      sql += ` AND EXISTS (SELECT 1 FROM "InterviewTrainer" it WHERE it."interviewId" = i.id AND it."trainerId" = $3)`;
      vals.push(req.user.id);
    }
    sql += ' ORDER BY i.date ASC';
    const r = await query(sql, vals);

    r.rows.sort((a, b) => {
      const sa = getInterviewStartAt(a.date, a.timeSlot);
      const sb = getInterviewStartAt(b.date, b.timeSlot);
      const ta = sa ? sa.getTime() : new Date(a.date).getTime();
      const tb = sb ? sb.getTime() : new Date(b.date).getTime();
      if (ta !== tb) return ta - tb;
      return String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''), undefined, { numeric: true });
    });

    const interviewIds = r.rows.map((i) => i.id);
    const trainersR = interviewIds.length ? await query(
      'SELECT it."interviewId", u.id, u.name FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = ANY($1)',
      [interviewIds]
    ) : { rows: [] };
    const trainersByI = {};
    for (const t of trainersR.rows) {
      if (!trainersByI[t.interviewId]) trainersByI[t.interviewId] = [];
      trainersByI[t.interviewId].push({ id: t.id, name: t.name });
    }
    const interviews = r.rows.map((row) => ({
      ...row,
      student: { id: row.s_id, name: row.s_name, course: row.s_course },
      trainers: (trainersByI[row.id] || []).map((t) => ({ trainer: t })),
    }));
    return success(res, interviews);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}

export async function getActivity(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    let sql = `SELECT i.id, i.company, i.status, i."updatedAt", s.name as "s_name" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId"`;
    const vals = [];
    if (req.user.role === 'TRAINER') {
      sql += ` WHERE EXISTS (SELECT 1 FROM "InterviewTrainer" it WHERE it."interviewId" = i.id AND it."trainerId" = $1)`;
      vals.push(req.user.id);
    }
    sql += ` ORDER BY i."updatedAt" DESC LIMIT $${vals.length + 1}`;
    vals.push(limit);
    const r = await query(sql, vals);
    const activity = r.rows.map((i) => ({
      id: i.id,
      type: 'interview',
      message: `${i.s_name} - ${i.company} (${i.status})`,
      timestamp: i.updatedAt,
    }));
    return success(res, activity);
  } catch (err) {
    if (err.code === '42P01') return success(res, []);
    next(err);
  }
}

export async function getAnalytics(req, res, next) {
  try {
    const eightWeeksAgo = addDays(new Date(), -56);
    const [interviewsByWeek, statusR, byMonth, topCompaniesR, trainerStatsR] = await Promise.all([
      query('SELECT date_trunc(\'week\', date) as week, COUNT(*)::int as count FROM "Interview" WHERE date >= $1 GROUP BY date_trunc(\'week\', date) ORDER BY week', [eightWeeksAgo]),
      query('SELECT status, COUNT(*)::int as count FROM "Interview" GROUP BY status'),
      query('SELECT date_trunc(\'month\', date) as month, COUNT(*)::int as count FROM "Interview" WHERE status = $1 GROUP BY date_trunc(\'month\', date) ORDER BY month', ['SELECTED']),
      query('SELECT company, COUNT(*)::int as count FROM "Interview" WHERE status = $1 GROUP BY company ORDER BY count DESC LIMIT 10', ['SELECTED']),
      query('SELECT "trainerId", COUNT(*)::int as count FROM "InterviewTrainer" GROUP BY "trainerId"'),
    ]);
    const trainerIds = trainerStatsR.rows.map((t) => t.trainerId);
    const trainersR = trainerIds.length ? await query('SELECT id, name FROM "User" WHERE id = ANY($1)', [trainerIds]) : { rows: [] };
    const nameMap = Object.fromEntries(trainersR.rows.map((t) => [t.id, t.name]));
    const trainerPerformance = trainerStatsR.rows.map((t) => ({
      trainerId: t.trainerId,
      trainerName: nameMap[t.trainerId] || 'Unknown',
      assignedCount: t.count,
    }));
    return success(res, {
      interviewsPerWeek: interviewsByWeek.rows,
      statusDistribution: statusR.rows.map((r) => ({ status: r.status, _count: { id: r.count } })),
      placementTrend: byMonth.rows,
      topCompanies: topCompaniesR.rows,
      trainerPerformance,
    });
  } catch (err) {
    if (err.code === '42P01') {
      return success(res, {
        interviewsPerWeek: [],
        statusDistribution: [],
        placementTrend: [],
        topCompanies: [],
        trainerPerformance: [],
      });
    }
    next(err);
  }
}
