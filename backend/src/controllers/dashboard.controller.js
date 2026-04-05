import { query } from '../config/db.js';
import { success } from '../utils/response.utils.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from '../utils/date.utils.js';

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
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

    const [totalR, todayR, shortR, placedR] = await Promise.all([
      query('SELECT COUNT(*)::int as c FROM "Student"'),
      query('SELECT COUNT(*)::int as c FROM "Interview" WHERE date >= $1 AND date <= $2 AND status != $3', [todayStart, todayEnd, 'REJECTED']),
      query('SELECT COUNT(*)::int as c FROM "Interview" WHERE status = $1', ['SHORTLISTED']),
      query('SELECT COUNT(*)::int as c FROM "Interview" WHERE status = $1 AND date >= $2 AND date <= $3', ['SELECTED', monthStart, monthEnd]),
    ]);
    return success(res, {
      totalStudents: totalR.rows[0]?.c ?? 0,
      todayInterviews: todayR.rows[0]?.c ?? 0,
      shortlisted: shortR.rows[0]?.c ?? 0,
      placedThisMonth: placedR.rows[0]?.c ?? 0,
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
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    let sql = `SELECT i.*, s.id as "s_id", s.name as "s_name", s.course as "s_course" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.date >= $1 AND i.date <= $2`;
    const vals = [todayStart, todayEnd];
    if (req.user.role === 'TRAINER') {
      sql += ` AND EXISTS (SELECT 1 FROM "InterviewTrainer" it WHERE it."interviewId" = i.id AND it."trainerId" = $3)`;
      vals.push(req.user.id);
    }
    sql += ' ORDER BY i.date ASC';
    const r = await query(sql, vals);

    function firstTimeSlotNumber(timeSlot) {
      const m = String(timeSlot || '').match(/(\d{1,2})/);
      if (!m) return 9999;
      const n = parseInt(m[1], 10);
      return Number.isFinite(n) ? n : 9999;
    }
    r.rows.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta !== tb) return ta - tb;
      const ha = firstTimeSlotNumber(a.timeSlot);
      const hb = firstTimeSlotNumber(b.timeSlot);
      if (ha !== hb) return ha - hb;
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
