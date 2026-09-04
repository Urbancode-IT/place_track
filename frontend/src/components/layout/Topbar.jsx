import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';

function formatNow() {
  const d = new Date();
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const date = d
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { day, date, time };
}

export function Topbar() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const toggleSidebarMobile = useUIStore((s) => s.toggleSidebarMobile);
  const { day, date, time } = formatNow();
  const [search, setSearch] = useState('');

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const q = search.trim();
    navigate(q ? `/students?search=${encodeURIComponent(q)}` : '/students');
  };

  return (
    <header
      className="shell-surface sticky top-0 z-20 flex items-center justify-between px-5 h-14 border-b"
      style={{ borderColor: 'var(--shell-border)' }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebarMobile}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition hover:bg-[var(--surface-hover)] border border-[var(--shell-border)]"
          style={{ color: 'var(--text2)' }}
          aria-label="Open menu"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--shell-border)]"
        >
          <svg className="h-4 w-4 shrink-0 text-[var(--text3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students, companies"
            className="w-48 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--text3)] outline-none"
            aria-label="Search students"
          />
        </form>

        <Button
          size="sm"
          className="text-[11px] font-semibold px-4 py-2 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #00D4FF, #00a8cc)',
            color: '#fff',
            boxShadow: '0 0 20px rgba(0,212,255,0.4)',
            border: 'none',
          }}
          onClick={() => navigate('/schedule')}
        >
          + Schedule
        </Button>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] tracking-[0.14em] uppercase text-[var(--text3)]">
            {day} · {date}
          </span>
          <span className="text-sm font-medium text-[var(--text)]">{time}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="text-[11px] text-[var(--text3)] hover:text-[var(--cyan)] transition px-2"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
