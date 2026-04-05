import cron from 'node-cron';
import { query } from '../config/db.js';

export function runWeeklyReport() {
  cron.schedule('0 9 * * 1', async () => {
    const admins = await query('SELECT id, email FROM "User" WHERE role = $1', ['ADMIN']);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const [totalR, selectedR, scheduledR] = await Promise.all([
      query('SELECT COUNT(*)::int as c FROM "Interview" WHERE "createdAt" >= $1', [weekStart]),
      query('SELECT COUNT(*)::int as c FROM "Interview" WHERE status = $1 AND "updatedAt" >= $2', ['SELECTED', weekStart]),
      query('SELECT COUNT(*)::int as c FROM "Interview" WHERE status = $1', ['SCHEDULED']),
    ]);
    const summary = `Weekly Report: ${totalR.rows[0]?.c ?? 0} interviews, ${selectedR.rows[0]?.c ?? 0} selected, ${scheduledR.rows[0]?.c ?? 0} scheduled.`;
    const { sendDailySummary } = await import('../services/email.service.js');
    for (const admin of admins.rows) {
      if (admin.email) await sendDailySummary(admin.email, `<p>${summary}</p>`).catch(() => {});
    }
  });
}
