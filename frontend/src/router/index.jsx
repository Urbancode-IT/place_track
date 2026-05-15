import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { Spinner } from '@/components/ui/Spinner';
import AppLayout from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

const PublicInterviewFill = lazy(() => import('@/pages/PublicInterviewFill'));
const PublicInterviewApply = lazy(() => import('@/pages/PublicInterviewApply'));
const PublicInterviewFinish = lazy(() => import('@/pages/PublicInterviewFinish'));
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Students = lazy(() => import('@/pages/Students'));
const StudentProfile = lazy(() => import('@/pages/StudentProfile'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const TrainerView = lazy(() => import('@/pages/TrainerView'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Settings = lazy(() => import('@/pages/Settings'));
const Reference = lazy(() => import('@/pages/Reference'));
const PendingSelfSubmits = lazy(() => import('@/pages/PendingSelfSubmits'));
const PendingInterviewFinishes = lazy(() => import('@/pages/PendingInterviewFinishes'));
const HonestReviewLinkPage = lazy(() => import('@/pages/HonestReviewLinkPage'));
const PublicHonestReview = lazy(() => import('@/pages/PublicHonestReview'));
const PublicHonestReviewCommon = lazy(() => import('@/pages/PublicHonestReviewCommon'));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function Lazy({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

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
    element: (
      <Lazy>
        <PublicInterviewApply />
      </Lazy>
    ),
  },
  {
    path: '/interview/finish',
    element: (
      <Lazy>
        <PublicInterviewFinish />
      </Lazy>
    ),
  },
  {
    path: '/interview/fill/:token',
    element: (
      <Lazy>
        <PublicInterviewFill />
      </Lazy>
    ),
  },
  {
    path: '/honest-review',
    element: (
      <Lazy>
        <PublicHonestReviewCommon />
      </Lazy>
    ),
  },
  {
    path: '/honest-review/:token',
    element: (
      <Lazy>
        <PublicHonestReview />
      </Lazy>
    ),
  },
  {
    path: '/login',
    element: (
      <Lazy>
        <AuthLayout>
          <Login />
        </AuthLayout>
      </Lazy>
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
      {
        index: true,
        element: (
          <Lazy>
            <Dashboard />
          </Lazy>
        ),
      },
      {
        path: 'students',
        element: (
          <Lazy>
            <Students />
          </Lazy>
        ),
      },
      {
        path: 'students/:id',
        element: (
          <Lazy>
            <StudentProfile />
          </Lazy>
        ),
      },
      {
        path: 'schedule',
        element: (
          <Lazy>
            <Schedule />
          </Lazy>
        ),
      },
      {
        path: 'trainers',
        element: (
          <Lazy>
            <TrainerView />
          </Lazy>
        ),
      },
      {
        path: 'notifications',
        element: (
          <Lazy>
            <Notifications />
          </Lazy>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute adminOnly>
            <Lazy>
              <Analytics />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <Lazy>
            <Settings />
          </Lazy>
        ),
      },
      {
        path: 'reference',
        element: (
          <Lazy>
            <Reference />
          </Lazy>
        ),
      },
      {
        path: 'pending-self-submits',
        element: (
          <Lazy>
            <PendingSelfSubmits />
          </Lazy>
        ),
      },
      {
        path: 'pending-interview-finishes',
        element: (
          <Lazy>
            <PendingInterviewFinishes />
          </Lazy>
        ),
      },
      {
        path: 'honest-review-link',
        element: (
          <Lazy>
            <HonestReviewLinkPage />
          </Lazy>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export default routes;
