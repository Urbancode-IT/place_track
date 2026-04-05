import { query } from '../config/db.js';

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(arr) {
  return arr.map(escapeCsv).join(',');
}

export async function exportScheduleCsv(req, res, next) {
  try {
    const { course, status, dateFrom, dateTo } = req.query;
    const conds = ['1=1'];
    const vals = [];
    let idx = 1;
    if (status) { conds.push(`i.status = $${idx++}`); vals.push(status); }
    if (dateFrom) { conds.push(`i.date >= $${idx++}`); vals.push(dateFrom); }
    if (dateTo) { conds.push(`i.date <= $${idx++}`); vals.push(dateTo); }
    if (course) { conds.push(`s.course = $${idx++}`); vals.push(course); }
    let joinSql = '';
    if (req.user.role === 'TRAINER') { joinSql = ' INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id AND it."trainerId" = $' + idx; vals.push(req.user.id); idx++; }
    const r = await query(
      `SELECT i.*, s.name as "s_name", s.course as "s_course"
       FROM "Interview" i JOIN "Student" s ON s.id = i."studentId"${joinSql} WHERE ${conds.join(' AND ')} ORDER BY i.date ASC`,
      vals
    );
    const interviewIds = r.rows.map((i) => i.id);
    const trainersR = interviewIds.length ? await query(
      'SELECT it."interviewId", u.name FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = ANY($1)',
      [interviewIds]
    ) : { rows: [] };
    const trainersByI = {};
    for (const t of trainersR.rows) {
      if (!trainersByI[t.interviewId]) trainersByI[t.interviewId] = [];
      trainersByI[t.interviewId].push(t.name);
    }
    const headers = ['S.No', 'Student', 'Course', 'Company', 'Round', 'Date', 'Time', 'Trainers', 'HR Number', 'Room', 'Status'];
    const rows = r.rows.map((i, idx) =>
      toCsvRow([
        idx + 1,
        i.s_name,
        i.s_course,
        i.company,
        i.round,
        i.date?.toISOString?.()?.slice(0, 10) ?? '',
        i.timeSlot,
        (trainersByI[i.id] || []).join('; '),
        i.hrNumber ?? '',
        i.room ?? '',
        i.status,
      ])
    );
    const csv = [toCsvRow(headers), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="schedule.csv"');
    return res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
}

export async function exportStudentsCsv(req, res, next) {
  try {
    const { course, status } = req.query;
    let sql = 'SELECT DISTINCT s.* FROM "Student" s';
    const conds = [];
    const vals = [];
    let idx = 1;
    if (req.user.role === 'TRAINER') {
      sql += ` INNER JOIN "Interview" i ON i."studentId" = s.id INNER JOIN "InterviewTrainer" it ON it."interviewId" = i.id AND it."trainerId" = $${idx}`;
      vals.push(req.user.id);
      idx++;
    }
    if (course) { conds.push(`s.course = $${idx++}`); vals.push(course); }
    if (status) {
      if (!sql.includes('JOIN "Interview"')) sql += ` INNER JOIN "Interview" i ON i."studentId" = s.id`;
      conds.push(`i.status = $${idx++}`);
      vals.push(status);
    }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY s.name ASC';
    const r = await query(sql, vals);
    const studentIds = r.rows.map((s) => s.id);
    const latestR = studentIds.length ? await query(
      `SELECT DISTINCT ON ("studentId") "studentId", status FROM "Interview" WHERE "studentId" = ANY($1) ORDER BY "studentId", date DESC`,
      [studentIds]
    ) : { rows: [] };
    const statusMap = Object.fromEntries(latestR.rows.map((row) => [row.studentId, row.status]));
    const headers = ['Name', 'Email', 'Phone', 'Course', 'Batch', 'Latest Status'];
    const rows = r.rows.map((s) =>
      toCsvRow([s.name, s.email ?? '', s.phone ?? '', s.course, s.batchId ?? '', statusMap[s.id] ?? ''])
    );
    const csv = [toCsvRow(headers), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    return res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
}
