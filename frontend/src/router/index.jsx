import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { Spinner } from '@/components/ui/Spinner';
import AppLayout from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import PublicInterviewFill from '@/pages/PublicInterviewFill';
import PublicInterviewApply from '@/pages/PublicInterviewApply';
import PublicInterviewFinish from '@/pages/PublicInterviewFinish';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import StudentProfile from '@/pages/StudentProfile';
import Schedule from '@/pages/Schedule';
import TrainerView from '@/pages/TrainerView';
import Notifications from '@/pages/Notifications';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Reference from '@/pages/Reference';
import PendingSelfSubmits from '@/pages/PendingSelfSubmits';
import PendingInterviewFinishes from '@/pages/PendingInterviewFinishes';
import HonestReviewLinkPage from '@/pages/HonestReviewLinkPage';
import PublicHonestReview from '@/pages/PublicHonestReview';
import PublicHonestReviewCommon from '@/pages/PublicHonestReviewCommon';
import SyncZen from '@/pages/SyncZen';

function ProtectedRoute({ children, adminOnly }) {
  const hydrated = useAuthHydrated();
  const { isAuthenticated, user } = useAuthStore();

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

const routes = [
  {
    path: '/interview/apply',
    element: <PublicInterviewApply />,
  },
  {
    path: '/interview/finish',
    element: <PublicInterviewFinish />,
  },
  {
    path: '/interview/fill/:token',
    element: <PublicInterviewFill />,
  },
  {
    path: '/honest-review',
    element: <PublicHonestReviewCommon />,
  },
  {
    path: '/honest-review/:token',
    element: <PublicHonestReview />,
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <Login />
      </AuthLayout>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'students', element: <Students /> },
      { path: 'students/:id', element: <StudentProfile /> },
      { path: 'schedule', element: <Schedule /> },
      { path: 'trainers', element: <TrainerView /> },
      { path: 'notifications', element: <Notifications /> },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute adminOnly>
            <Analytics />
          </ProtectedRoute>
        ),
      },
      { path: 'settings', element: <Settings /> },
      { path: 'reference', element: <Reference /> },
      { path: 'pending-self-submits', element: <PendingSelfSubmits /> },
      { path: 'pending-interview-finishes', element: <PendingInterviewFinishes /> },
      { path: 'honest-review-link', element: <HonestReviewLinkPage /> },
      { path: 'sync-zen', element: <SyncZen /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export default routes;
