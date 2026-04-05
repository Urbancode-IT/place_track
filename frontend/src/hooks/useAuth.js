import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, logout } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) {
      authApi.me()
        .then(({ data }) => setAuth(data.data, accessToken))
        .catch(() => logout());
    }
  }, [accessToken, user, setAuth, logout]);

  return { user, accessToken, isAuthenticated, setAuth, logout };
}
