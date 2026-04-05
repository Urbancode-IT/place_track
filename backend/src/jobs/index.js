import { runDailyReminder } from './dailyReminder.job.js';
import { runWeeklyReport } from './weeklyReport.job.js';
import { runTrainerInterviewReminder } from './trainerInterviewReminder.job.js';

export function initCronJobs() {
  if (process.env.NODE_ENV === 'test') return;
  runDailyReminder();
  runWeeklyReport();
  runTrainerInterviewReminder();
}
