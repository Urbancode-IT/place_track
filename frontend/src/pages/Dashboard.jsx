import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { dashboardApi } from '@/api/dashboard.api';
import { studentApi } from '@/api/student.api';
import { StatCard } from '@/components/dashboard/StatCard';
import { TodayInterviews } from '@/components/dashboard/TodayInterviews';
import { Spinner } from '@/components/ui/Spinner';
import { useSocket } from '@/hooks/useSocket';
import { AddScheduleModal } from '@/components/interviews/AddScheduleModal';
import { useUpdateInterview } from '@/hooks/useInterviews';
import { useNotificationStore } from '@/store/notification.store';
import { DashboardCreateStudentLink } from '@/components/dashboard/DashboardCreateStudentLink';
import { todayLocalISO } from '@/utils/formatDate';
import { useModulePath } from '@/lib/modulePath';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function GreetingWave() {
  return (
    <svg viewBox="0 0 400 40" className="w-full h-10 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(0,212,255,0)" />
          <stop offset="30%" stopColor="rgba(0,212,255,0.8)" />
          <stop offset="70%" stopColor="rgba(155,93,255,0.8)" />
          <stop offset="100%" stopColor="rgba(155,93,255,0)" />
        </linearGradient>
        <filter id="waveGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M0,20 Q50,5 100,20 T200,20 T300,20 T400,20"
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth="2"
        filter="url(#waveGlow)"
      />
    </svg>
  );
}

function DashboardGreeting({ name }) {
  const greeting = getGreeting();
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const firstName = name?.split(' ')[0] || 'Admin';

  return (
    <div className="glass-surface glass-surface-glow rounded-[20px] p-5 relative overflow-hidden">
      <div className="relative z-10">
        <p className="text-[11px] tracking-wide text-[var(--text3)] uppercase">Welcome back</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mt-1">
          {greeting}, <span className="text-gradient-cyan">{firstName}</span>
        </h1>
        <p className="text-lg text-[var(--text2)] mt-1 font-medium">{time}</p>
      </div>
      <GreetingWave />
    </div>
  );
}

export default function Dashboard() {
  const [boardDate, setBoardDate] = useState(todayLocalISO);
  const qc = useQueryClient();
  const [editingInterview, setEditingInterview] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const to = useModulePath();
  const updateInterview = useUpdateInterview();
  const addToast = useNotificationStore((s) => s.addToast);
  const dashboardReady = hydrated && !!accessToken;

  const queryOptions = {
    enabled: dashboardReady,
    staleTime: 1000 * 60 * 2, // 2 minutes - data remains fresh longer
    refetchOnWindowFocus: false, // Don't refetch every time user switches tabs
  };

  const { data: pendingData } = useQuery({
    queryKey: ['dashboard', 'pending-self-submits'],
    queryFn: () => dashboardApi.pendingSelfSubmits().then((r) => r.data),
    ...queryOptions,
  });
  const { data: pendingFinishData } = useQuery({
    queryKey: ['dashboard', 'pending-interview-finishes'],
    queryFn: () => dashboardApi.pendingInterviewFinishes().then((r) => r.data),
    ...queryOptions,
  });
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    ...queryOptions,
  });
  const { data: todayData } = useQuery({
    queryKey: ['dashboard', 'today', boardDate],
    queryFn: () => dashboardApi.today(boardDate).then((r) => r.data),
    ...queryOptions,
    staleTime: 1000 * 60, // Today's list is more sensitive (1 min)
  });

  useSocket({
    'interview:created': () => {
      qc.invalidateQueries({ queryKey: ['dashboard', 'today'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
    'interview:updated': () => {
      qc.invalidateQueries({ queryKey: ['dashboard', 'today'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });

  const pendingCount = pendingData?.data?.count ?? 0;
  const pendingFinishCount = pendingFinishData?.data?.count ?? 0;
  const stats = statsData?.data || {};
  const totalStudents = stats.totalStudents ?? 0;
  const todayCount = stats.todayInterviews ?? 0;
  const shortlisted = stats.shortlisted ?? 0;
  const placed = stats.placedThisMonth ?? 0;

  if (!dashboardReady) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5 text-[var(--text)]">
      <DashboardGreeting name={user?.name} />

      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {pendingCount > 0 && (
          <Link
            to={to('/pending-self-submits')}
            className="block rounded-[20px] px-4 py-3 text-sm font-medium transition hover:opacity-95 glass-surface"
            style={{
              borderColor: 'rgba(255,214,10,0.35)',
              boxShadow: '0 0 30px rgba(255,214,10,0.08)',
            }}
          >
            <span className="text-[10px] tracking-wider text-[var(--yellow)] font-medium">ACTION</span>
            <span className="block mt-0.5">
              {pendingCount} student interview submission{pendingCount === 1 ? '' : 's'} waiting for approval — open queue →
            </span>
          </Link>
        )}

        {pendingFinishCount > 0 && (
          <Link
            to={to('/pending-interview-finishes')}
            className="block rounded-[20px] px-4 py-3 text-sm font-medium transition hover:opacity-95 glass-surface"
            style={{
              borderColor: 'rgba(155,93,255,0.35)',
              boxShadow: '0 0 30px rgba(155,93,255,0.1)',
            }}
          >
            <span className="text-[10px] tracking-wider text-[var(--violet)] font-medium">ACTION</span>
            <span className="block mt-0.5">
              {pendingFinishCount} interview finish submission{pendingFinishCount === 1 ? '' : 's'} waiting — open queue →
            </span>
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <DashboardCreateStudentLink />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[120px]">
          {statsLoading ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              <StatCard
                variant="hero"
                title="TOTAL STUDENTS"
                value={totalStudents}
                sub={`${todayCount} interviews today`}
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
            </>
          )}
        </div>

        <TodayInterviews
          interviews={todayData?.data}
          boardDate={boardDate}
          onBoardDateChange={setBoardDate}
          onEdit={(interview) => {
            setEditingInterview(interview);
            setEditModalOpen(true);
          }}
        />
      </div>

      <AddScheduleModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingInterview(null);
        }}
        initialData={editingInterview}
        mode="edit"
        onSubmit={async (payload) => {
          if (!editingInterview?.id) return;
          const { course, ...interviewData } = payload;
          try {
            if (interviewData.studentId && course) {
              await studentApi.update(interviewData.studentId, { course });
              qc.invalidateQueries({ queryKey: ['students'] });
            }
            await updateInterview.mutateAsync({ id: editingInterview.id, data: interviewData });
          } catch (e) {
            addToast({
              type: 'error',
              message: e?.response?.data?.message || e?.message || 'Could not update interview',
            });
            throw e;
          }
        }}
      />
    </div>
  );
}
