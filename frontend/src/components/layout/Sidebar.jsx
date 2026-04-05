import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';

function Icon({ name, className = 'h-5 w-5' }) {
  const common = { className, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8 };
  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5V6.75A2.75 2.75 0 016.75 4h3.5A2.75 2.75 0 0113 6.75v10.5A2.75 2.75 0 0110.25 20h-3.5A2.75 2.75 0 014 17.25V16" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.75A2.75 2.75 0 0117.75 6h.5A2.75 2.75 0 0121 8.75v8.5A2.75 2.75 0 0118.25 20h-.5A2.75 2.75 0 01 15 17.25v-8.5Z" />
        </svg>
      );
    case 'students':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 19.5c0-2.485-2.239-4.5-5-4.5s-5 2.015-5 4.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 12.5a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 19.5c0-1.844-1.2-3.43-2.9-4.11" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.25 6.4a3 3 0 010 5.76" />
        </svg>
      );
    case 'schedule':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5m8 2V5M6.5 10.5h11" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 20h10.5A2.75 2.75 0 0020 17.25V8.75A2.75 2.75 0 0017.25 6H6.75A2.75 2.75 0 004 8.75v8.5A2.75 2.75 0 006.75 20Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h3m-3 3h6" />
        </svg>
      );
    case 'trainers':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 18.5c0-2.21 1.79-4 4-4s4 1.79 4 4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.5a3 3 0 100-6 3 3 0 000 6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5l8-3 8 3-8 3-8-3Z" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 16h6" />
        </svg>
      );
    case 'reference':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17V7a2 2 0 012-2h10v12a2 2 0 01-2 2H7Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17a2 2 0 01-2-2V7a2 2 0 012-2" />
        </svg>
      );
    case 'notifications':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 17V11a6 6 0 10-12 0v6l-1.5 1.5h15L18 17Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19.5a2 2 0 004 0" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5V5.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19.5v-8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 19.5v-12" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 19.5v-5" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a7.9 7.9 0 000-6l-1.72.66a6.1 6.1 0 00-1.23-1.23L17.1 6.7a7.9 7.9 0 00-6-2.4l-.34 1.82a6.1 6.1 0 00-1.74.71L7.3 5.6a7.9 7.9 0 00-6 6l1.82.34a6.1 6.1 0 00.71 1.74L2.6 16.7a7.9 7.9 0 006 6l.34-1.82a6.1 6.1 0 001.74-.71l1.72 1.23a7.9 7.9 0 006-6l-1.82-.34a6.1 6.1 0 00-.71-1.74L19.4 15Z" />
        </svg>
      );
    case 'honestReview':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5v6l2.5 2.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15a2 2 0 002-2v-9a2 2 0 00-2-2h-3.09a2 2 0 01-1.64-.9l-.82-1.2a2 2 0 00-1.64-.9h-1.82a2 2 0 00-1.64.9l-.82 1.2a2 2 0 01-1.64.9H4.5a2 2 0 00-2 2v9a2 2 0 002 2Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14h1.5M12 14h3.5" />
        </svg>
      );
    default:
      return null;
  }
}

const mainNav = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/students', icon: 'students', label: 'Students' },
  { to: '/schedule', icon: 'schedule', label: 'Schedule' },
  { to: '/trainers', icon: 'trainers', label: 'Trainers' },
];

const secondaryNav = [
  { to: '/pending-self-submits', icon: 'clipboard', label: 'Student submits' },
  { to: '/honest-review-link', icon: 'honestReview', label: 'Honest review link', trainerOrAdmin: true },
  { to: '/reference', icon: 'reference', label: 'Reference' },
  { to: '/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/analytics', icon: 'analytics', label: 'Analytics', adminOnly: true },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

function NavItem({ item, end, collapsed }) {
  const sub =
    item.to === '/' ? 'OVERVIEW' : item.to.replace(/^\//, '').replace(/\//g, '-').toUpperCase();

  return (
    <NavLink
      to={item.to}
      end={end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'group relative flex items-center rounded-xl py-2.5 transition',
          collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          isActive ? 'text-[var(--text)]' : 'text-[var(--text2)] hover:text-[var(--text)]',
        ].join(' ')
      }
      style={({ isActive }) => ({
        background: isActive ? 'rgba(54,153,255,0.12)' : 'transparent',
        border: '1px solid',
        borderColor: isActive ? 'rgba(54,153,255,0.22)' : 'transparent',
      })}
    >
      {({ isActive }) => (
        <>
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
            style={{
              background: isActive ? 'rgba(54,153,255,0.14)' : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: isActive ? '0 12px 30px rgba(54,153,255,0.12)' : 'none',
            }}
          >
            <Icon name={item.icon} className="h-5 w-5" />
          </span>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="text-[10px] font-mono tracking-wide text-[var(--text3)]">{sub}</span>
            </div>
          )}

          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r"
              style={{
                background: 'linear-gradient(180deg, rgba(0,212,255,0.85), rgba(155,93,255,0.85))',
              }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'AD';

  const canSee = (item) => {
    if (item.adminOnly && user?.role !== 'ADMIN') return false;
    if (item.trainerOrAdmin && user?.role !== 'TRAINER' && user?.role !== 'ADMIN') return false;
    return true;
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-[100dvh] max-h-[100dvh] flex-col py-5 transition-[width] duration-200 ease-out ${collapsed ? 'w-[4.5rem] px-2' : 'w-64 px-4'}`}
      style={{
        background: 'rgba(10,13,24,0.70)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRight: '1px solid var(--border)',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header: brand — stays visible */}
      <div className="shrink-0">
        {/* Brand + collapse toggle */}
        <div
          className={`flex px-1 ${collapsed ? 'flex-col items-center gap-3' : 'items-start justify-between gap-2'}`}
        >
          <div className={`flex min-w-0 items-center gap-3 ${collapsed ? '' : 'flex-1'}`}>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg,#00D4FF,#9B5DFF)',
                boxShadow: '0 0 18px rgba(0,212,255,0.40)',
              }}
            >
              <span className="font-syne text-sm font-extrabold text-black">PT</span>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex flex-col">
                <span className="font-syne text-sm font-extrabold tracking-tight">PlaceTrack</span>
                <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--text3)]">PLACEMENT PORTAL</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text)] transition hover:opacity-90 active:scale-95"
            style={{
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable nav — Settings + links stay reachable above taskbar / small viewports */}
      <div className="scrollbar-none mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-0.5">
        <div>
          {!collapsed && (
            <p className="px-2 pb-2 font-mono text-[10px] tracking-[0.18em] text-[var(--text3)]">MAIN</p>
          )}
          <nav className="flex flex-col gap-1">
            {mainNav.filter(canSee).map((item) => (
              <NavItem key={item.to} item={item} end={item.to === '/'} collapsed={collapsed} />
            ))}
          </nav>
        </div>

        <div className="mt-6 pb-2">
          {!collapsed && (
            <p className="px-2 pb-2 font-mono text-[10px] tracking-[0.18em] text-[var(--text3)]">TOOLS</p>
          )}
          <nav className="flex flex-col gap-1">
            {secondaryNav.filter(canSee).map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} />
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom user — pinned below scroll area */}
      <div
        className={`mt-3 shrink-0 flex items-center rounded-2xl border py-3 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
        title={collapsed ? `${user?.name || 'Admin'} · ${user?.role || 'ADMIN'}` : undefined}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-syne text-[12px] font-extrabold"
          style={{
            background: 'linear-gradient(135deg,#00D4FF,#9B5DFF)',
            color: '#000',
            boxShadow: '0 0 18px rgba(0,212,255,0.35)',
          }}
        >
          {initials}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{user?.name || 'Admin'}</div>
            <div className="truncate font-mono text-[10px] tracking-wide text-[var(--text3)]">{user?.role || 'ADMIN'}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
