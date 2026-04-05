import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';

function formatNow() {
  const d = new Date();
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const date = d
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${day} · ${date} · ${time}`;
}

export function Topbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 h-14"
      style={{
        background: 'rgba(10,13,24,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: breadcrumb + title */}
      <div className="flex flex-col">
        <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">
          01 ▸ DASHBOARD ▸ COMMAND CENTER
        </span>
        <span className="font-syne text-[13px] font-bold text-[var(--text)]">
          Command Center — Admin
        </span>
      </div>

      {/* Middle: date */}
      <div className="hidden md:flex items-center justify-center font-mono text-[10px] text-[var(--text3)]">
        {formatNow()}
      </div>

      {/* Right: theme + search + schedule + logout */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-full text-[13px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text3)',
          }}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☾' : '☀︎'}
        </button>

        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span className="text-[12px] text-[var(--text3)]">Search students, companies</span>
          <span
            className="font-mono text-[9px] px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text3)' }}
          >
            ⌘K
          </span>
        </div>

        <Button
          size="sm"
          className="font-syne text-[11px] font-extrabold px-4 py-1.5 rounded-lg"
          style={{
            background: 'var(--cyan)',
            color: '#000',
            boxShadow: '0 0 12px rgba(0,212,255,0.45)',
          }}
          onClick={() => navigate('/schedule')}
        >
          + Schedule
        </Button>

        <button
          type="button"
          onClick={handleLogout}
          className="font-mono text-[10px] text-[var(--text3)] hover:text-[var(--cyan)]"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
