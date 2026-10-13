import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/helpers';
import { API_BASE_URL, getApiHealthUrl } from '@/lib/apiConfig';
import { isTransientNetworkError, retryOnNetworkError, shouldRetryLogin } from '@/lib/networkError';
import { landingPath } from '@/lib/modulePath';
import { toast } from '@/components/ui/Toast';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(landingPath(user?.role, location.state?.from?.pathname), { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, user?.role]);

  const onSubmit = async (data) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError('');
    setIsSubmitting(true);
    let finishedOnPage = true;
    try {
      const { data: res } = await retryOnNetworkError(() => authApi.login(data), {
        attempts: 3,
        delayMs: 400,
        shouldRetry: shouldRetryLogin,
      });
      setAuth(res.data.user, res.data.accessToken);
      toast.success(`Welcome back, ${res.data?.user?.name || 'User'}!`);
      navigate(landingPath(res.data.user?.role, location.state?.from?.pathname), { replace: true });
      finishedOnPage = false;
    } catch (err) {
      const networkFail = isTransientNetworkError(err);
      if (networkFail) {
        const netMsg = import.meta.env.DEV
          ? 'Cannot reach the API. Open another terminal: cd backend → npm run dev — you must see “PlaceTrack API running on port 5001”. (Vite proxies /api to that port.) If you see “EADDRINUSE”, only one backend can use 5001 — close the extra terminal.'
          : `Cannot reach the API (${API_BASE_URL}). Check backend health: ${getApiHealthUrl()} — Render free tier may need 30–60s to wake up. Ensure Render has DATABASE_URL set and redeploy backend.`;
        setError(netMsg);
        toast.error('Cannot reach the backend API server.');
        return;
      }
      if (!err.response) {
        const fallbackMsg = err.message || 'Login failed';
        setError(fallbackMsg);
        toast.error(fallbackMsg);
        return;
      }
      const status = err.response.status;
      const raw = err.response?.data;
      const msg =
        raw && typeof raw === 'object' && typeof raw.message === 'string'
          ? raw.message
          : null;
      if (status === 503) {
        const s503Msg = msg || 'Backend or database unavailable (503). On Render: set a working DATABASE_URL (Render Postgres recommended), then redeploy the API service.';
        setError(s503Msg);
        toast.error(msg || 'Backend or database unavailable (503)');
        return;
      }
      if (status >= 500) {
        if (import.meta.env.DEV && !msg) {
          const devMsg = 'Backend not running on port 5001. Open a new terminal: cd backend → npm run dev — wait for “PlaceTrack API running on port 5001”. Keep it open; then try Sign in again.';
          setError(devMsg);
          toast.error('Backend not running on port 5001.');
          return;
        }
        const s500Msg = msg || 'Server error — check the backend terminal and PostgreSQL connection.';
        setError(s500Msg);
        toast.error(s500Msg);
      } else {
        const defaultErr = msg || 'Login failed';
        setError(defaultErr);
        toast.error(defaultErr);
      }
    } finally {
      inFlightRef.current = false;
      if (finishedOnPage) setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* soft glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[28px] blur-2xl opacity-60"
        style={{
          background:
            'radial-gradient(600px 200px at 30% 10%, rgba(54,153,255,0.35), transparent 60%), radial-gradient(500px 220px at 70% 90%, rgba(155,93,255,0.28), transparent 55%)',
        }}
      />

      <div
        className="relative overflow-hidden rounded-2xl border p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderColor: 'var(--panel-border)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
            <img src="/placetrack-icon.png" alt="Placetrack" className="h-12 w-12 object-contain drop-shadow-[0_0_10px_rgba(0,212,255,0.35)]" />
          </div>
          <h1 className="text-3xl font-medium tracking-tight">PlaceTrack</h1>
          <p className="mt-1 text-sm text-muted">urbancode</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            labelClassName="text-[color:var(--text2)]"
            className="bg-[rgba(255,255,255,0.03)] text-[color:var(--text)] placeholder:text-[color:var(--text3)] border-[color:var(--panel-border)] focus:ring-primary"
            {...register('email')}
          />

          <div className="w-full">
            <label className="mb-1 block text-sm font-medium text-[color:var(--text2)]" htmlFor="login-password">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={cn(
                  'glass-input w-full rounded-lg border border-[color:var(--panel-border)] bg-[rgba(255,255,255,0.03)] py-2 pl-3 pr-10 text-[color:var(--text)] outline-none placeholder:text-[color:var(--text3)] focus:border-transparent focus:ring-2 focus:ring-primary',
                  errors.password && 'border-danger'
                )}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[color:var(--text2)] transition hover:bg-white/5 hover:text-[color:var(--text)]"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password?.message && (
              <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div
              className="rounded-lg border px-3 py-2 text-sm text-danger"
              style={{ background: 'rgba(241,65,108,0.10)', borderColor: 'rgba(241,65,108,0.22)' }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full shadow-[0_14px_35px_rgba(54,153,255,0.25)] hover:shadow-[0_18px_45px_rgba(54,153,255,0.30)] focus:ring-primary disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="pt-1 text-center text-xs text-muted">
            Use your admin credentials to continue.
          </p>
        </form>
      </div>
    </div>
  );
}
