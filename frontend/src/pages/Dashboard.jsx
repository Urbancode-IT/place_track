import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { dashboardApi } from '@/api/dashboard.api';
import { StatCard } from '@/components/dashboard/StatCard';
import { TodayInterviews } from '@/components/dashboard/TodayInterviews';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { TrainerWorkload } from '@/components/dashboard/TrainerWorkload';
import { Spinner } from '@/components/ui/Spinner';
import { useSocket } from '@/hooks/useSocket';
import { DashboardCreateStudentLink } from '@/components/dashboard/DashboardCreateStudentLink';
import { DashboardInterviewFinishLink } from '@/components/dashboard/DashboardInterviewFinishLink';

export default function Dashboard() {
  const qc = useQueryClient();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const dashboardReady = hydrated && !!accessToken;

  const { data: pendingData } = useQuery({
    queryKey: ['dashboard', 'pending-self-submits'],
    queryFn: () => dashboardApi.pendingSelfSubmits().then((r) => r.data),
    enabled: dashboardReady,
  });
  const { data: pendingFinishData } = useQuery({
    queryKey: ['dashboard', 'pending-interview-finishes'],
    queryFn: () => dashboardApi.pendingInterviewFinishes().then((r) => r.data),
    enabled: dashboardReady,
  });
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    enabled: dashboardReady,
  });
  const { data: todayData } = useQuery({
    queryKey: ['dashboard', 'today'],
    queryFn: () => dashboardApi.today().then((r) => r.data),
    enabled: dashboardReady,
  });
  const { data: activityData } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardApi.activity().then((r) => r.data),
    enabled: dashboardReady,
  });
  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: () => dashboardApi.analytics().then((r) => r.data),
    enabled: dashboardReady,
  });

  useSocket({
    'interview:created': () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    'interview:updated': () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  const pendingCount = pendingData?.data?.count ?? 0;
  const pendingFinishCount = pendingFinishData?.data?.count ?? 0;
  const stats = statsData?.data || {};
  const totalStudents = stats.totalStudents ?? 0;
  const todayCount = stats.todayInterviews ?? 0;
  const shortlisted = stats.shortlisted ?? 0;
  const placed = stats.placedThisMonth ?? 0;

  if (!dashboardReady || statsLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6 text-[var(--text)]">
      <div className="flex flex-1 min-h-0 gap-6">
      {/* Left column */}
      <div className="flex-1 flex flex-col gap-4 pr-4 border-r min-w-0" style={{ borderColor: 'var(--border)' }}>
        {pendingCount > 0 && (
          <Link
            to="/pending-self-submits"
            className="block rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-95"
            style={{
              background: 'linear-gradient(90deg, rgba(255,214,10,0.15), rgba(0,212,255,0.12))',
              border: '1px solid rgba(255,214,10,0.35)',
              color: 'var(--text)',
            }}
          >
            <span className="font-mono text-[10px] tracking-wider text-[var(--yellow)]">ACTION</span>
            <span className="block mt-0.5">
              {pendingCount} student interview submission{pendingCount === 1 ? '' : 's'} waiting for approval — open queue →
            </span>
          </Link>
        )}

        {pendingFinishCount > 0 && (
          <Link
            to="/pending-interview-finishes"
            className="block rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-95"
            style={{
              background: 'linear-gradient(90deg, rgba(155,93,255,0.18), rgba(0,212,255,0.08))',
              border: '1px solid rgba(155,93,255,0.35)',
              color: 'var(--text)',
            }}
          >
            <span className="font-mono text-[10px] tracking-wider text-[var(--violet)]">ACTION</span>
            <span className="block mt-0.5">
              {pendingFinishCount} interview finish submission{pendingFinishCount === 1 ? '' : 's'} waiting — open queue →
            </span>
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <DashboardCreateStudentLink />
          <DashboardInterviewFinishLink />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            variant="hero"
            title="TOTAL STUDENTS"
            value={totalStudents}
            sub={`${todayCount} enrolled this week`}
          />
          <StatCard
            title="SHORTLISTED"
            value={shortlisted}
            progress={shortlisted ? Math.min(100, (shortlisted / (totalStudents || 1)) * 100) : 0}
          />
          <StatCard
            title="PLACED"
            value={placed}
            progress={placed ? Math.min(100, (placed / (totalStudents || 1)) * 100) : 0}
          />
        </div>

        <TodayInterviews interviews={todayData?.data} />
      </div>

      {/* Right column */}
      <div className="w-[360px] flex-shrink-0 flex flex-col gap-4 pl-2">
        <ActivityFeed items={activityData?.data} />
        <TrainerWorkload data={analyticsData?.data?.trainerPerformance} />
      </div>
      </div>
    </div>
  );
}
