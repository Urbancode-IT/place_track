import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export default function ProtectedRoute({ children, adminOnly = false, trainerOrAdmin = false }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (trainerOrAdmin && user?.role !== 'ADMIN' && user?.role !== 'TRAINER') {
    return <Navigate to="/" replace />;
  }
  return children;
}
