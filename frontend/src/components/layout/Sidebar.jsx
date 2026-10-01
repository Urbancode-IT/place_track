import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';

const DRAG_OPEN_PX = 36;
const EDGE_SWIPE_ZONE = 24;

function getPointerPoint(event) {
  if (event.touches?.length) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  if (event.changedTouches?.length) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

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
    case 'jobApplications':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.75h10A2.25 2.25 0 0119.25 7v12.5A1.75 1.75 0 0117.5 21.25h-11A1.75 1.75 0 014.75 19.5V7A2.25 2.25 0 017 4.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.75V3.5a1 1 0 011-1h4a1 1 0 011 1v1.25" />
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
  { to: '/job-applications', icon: 'jobApplications', label: 'Job Applications', trainerOrAdmin: true },
  { to: '/trainers', icon: 'trainers', label: 'Trainers', adminOnly: true },
];

const secondaryNav = [
  { to: '/pending-self-submits', icon: 'clipboard', label: 'Student submits' },
  { to: '/pending-interview-finishes', icon: 'clipboard', label: 'Finish queue' },
  { to: '/honest-review-link', icon: 'honestReview', label: 'Student review link', trainerOrAdmin: true },
  { to: '/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/analytics', icon: 'analytics', label: 'Analytics', adminOnly: true },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

const adminMainNav = [
  { to: '/admin', icon: 'dashboard', label: 'Dashboard' },
  { to: '/admin/students', icon: 'students', label: 'Students' },
  { to: '/admin/schedule', icon: 'schedule', label: 'Schedule' },
  { to: '/admin/job-applications', icon: 'jobApplications', label: 'Job Applications' },
  { to: '/admin/trainers', icon: 'trainers', label: 'Trainers' },
];

const adminSecondaryNav = [
  { to: '/admin/pending-self-submits', icon: 'clipboard', label: 'Student submits' },
  { to: '/admin/pending-interview-finishes', icon: 'clipboard', label: 'Finish queue' },
  { to: '/admin/honest-review-link', icon: 'honestReview', label: 'Student review link' },
  { to: '/admin/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
  { to: '/admin/settings', icon: 'settings', label: 'Settings' },
];

function NavItem({ item, end, collapsed, onNavigate, onExpandRequest }) {
  return (
    <NavLink
      to={item.to}
      end={end}
      onClick={(e) => {
        e.stopPropagation();
        if (collapsed) {
          e.preventDefault();
          onExpandRequest?.();
          return;
        }
        onNavigate?.();
      }}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'group relative flex items-center rounded-xl transition-all duration-200',
          collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
          isActive ? 'text-[var(--cyan)]' : 'text-[var(--text2)] hover:text-[var(--text)]',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-200"
            style={
              isActive
                ? {
                    background: 'rgba(0,212,255,0.15)',
                    boxShadow: '0 0 24px rgba(0,212,255,0.35), inset 0 0 12px rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.25)',
                  }
                : {
                    background: 'transparent',
                    border: '1px solid transparent',
                  }
            }
          >
            <Icon name={item.icon} className="h-5 w-5" />
          </span>
          {!collapsed && (
            <span className="text-sm font-medium truncate">{item.label}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const asideRef = useRef(null);
  const dragRef = useRef({ tracking: false, startX: 0, startY: 0, dragged: false });
  const user = useAuthStore((s) => s.user);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const expandSidebarCollapsed = useUIStore((s) => s.expandSidebarCollapsed);
  const collapseSidebarCollapsed = useUIStore((s) => s.collapseSidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.sidebarMobileOpen);
  const openSidebarMobile = useUIStore((s) => s.openSidebarMobile);
  const closeSidebarMobile = useUIStore((s) => s.closeSidebarMobile);

  const railCollapsed = collapsed && !mobileOpen;

  const openSidebar = () => {
    expandSidebarCollapsed();
    if (window.innerWidth < 768) openSidebarMobile();
  };

  const stopDrag = () => {
    dragRef.current.tracking = false;
  };

  const handleDragStart = (event) => {
    if (!railCollapsed) return;
    const { x, y } = getPointerPoint(event);
    dragRef.current = { tracking: true, startX: x, startY: y, dragged: false };
  };

  const handleDragMove = (event) => {
    if (!dragRef.current.tracking || !railCollapsed) return;

    const { x, y } = getPointerPoint(event);
    const dx = x - dragRef.current.startX;
    const dy = y - dragRef.current.startY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      if (Math.abs(dy) > Math.abs(dx)) {
        stopDrag();
        return;
      }
      dragRef.current.dragged = true;
    }

    if (dx >= DRAG_OPEN_PX) {
      openSidebar();
      stopDrag();
    }
  };

  const handleSidebarSurfaceClick = () => {
    if (dragRef.current.dragged) {
      dragRef.current.dragged = false;
      return;
    }
    if (railCollapsed) openSidebar();
  };

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && railCollapsed) {
      openSidebar();
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !mobileOpen) {
      collapseSidebarCollapsed();
    }
  };

  useEffect(() => {
    if (mobileOpen) return undefined;

    const edgeDrag = { tracking: false, startX: 0, startY: 0 };

    const onTouchStart = (event) => {
      const x = event.touches[0]?.clientX ?? 0;
      if (x > EDGE_SWIPE_ZONE) return;
      edgeDrag.tracking = true;
      edgeDrag.startX = x;
      edgeDrag.startY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event) => {
      if (!edgeDrag.tracking) return;
      const x = event.touches[0]?.clientX ?? 0;
      const y = event.touches[0]?.clientY ?? 0;
      const dx = x - edgeDrag.startX;
      const dy = y - edgeDrag.startY;

      if (Math.abs(dy) > Math.abs(dx)) {
        edgeDrag.tracking = false;
        return;
      }

      if (dx >= DRAG_OPEN_PX) {
        useUIStore.getState().expandSidebarCollapsed();
        if (window.innerWidth < 768) useUIStore.getState().openSidebarMobile();
        edgeDrag.tracking = false;
      }
    };

    const onTouchEnd = () => {
      edgeDrag.tracking = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (railCollapsed) return;

    const handleOutside = (event) => {
      if (asideRef.current && !asideRef.current.contains(event.target)) {
        collapseSidebarCollapsed();
        closeSidebarMobile();
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [railCollapsed, collapseSidebarCollapsed, closeSidebarMobile]);

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'AD';

  const isAdmin = user?.role === 'ADMIN';
  const canSee = (item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.trainerOrAdmin && user?.role !== 'TRAINER' && !isAdmin) return false;
    return true;
  };
  const primaryNav = (isAdmin ? adminMainNav : mainNav).filter(canSee);
  const extraNav = (isAdmin ? adminSecondaryNav : secondaryNav).filter(canSee);

  const widthClass = collapsed && !mobileOpen ? 'w-64 px-4 md:w-[4.5rem] md:px-2' : 'w-64 px-4';
  const translateClass = mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeSidebarMobile}
          aria-hidden="true"
        />
      )}
      <aside
        ref={asideRef}
        onClick={handleSidebarSurfaceClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={stopDrag}
        className={`shell-surface fixed left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] flex-col py-5 transition-[transform,width] duration-200 ease-out border-r touch-pan-y select-none ${translateClass} ${widthClass} ${railCollapsed ? 'md:cursor-pointer' : ''}`}
        style={{
          borderColor: 'var(--shell-border)',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        }}
        aria-expanded={!railCollapsed}
      >
        <div className="shrink-0">
          <div className={`flex px-1 ${railCollapsed ? 'flex-col items-center' : 'items-center gap-3'}`}>
            <div
              className={`flex min-w-0 items-center gap-3 ${railCollapsed ? 'cursor-pointer' : ''}`}
              title={railCollapsed ? 'Hover, tap, or drag right to expand sidebar' : undefined}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ filter: 'drop-shadow(0 0 14px rgba(0,212,255,0.45))' }}
              >
                <img src="/placetrack-icon.png" alt="Placetrack" className="h-10 w-10 object-contain" />
              </div>
              {!railCollapsed && (
                <div className="min-w-0 flex flex-col">
                  <span className="text-sm font-semibold tracking-tight">PlaceTrack</span>
                  <span className="text-[10px] tracking-[0.16em] text-[var(--text3)]">PLACEMENT PORTAL</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="scrollbar-none mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {isAdmin && !railCollapsed && (
            <p className="px-3 pb-2 text-[10px] tracking-[0.16em] uppercase text-[var(--text3)]">Admin</p>
          )}
          <nav className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                end={item.to === '/' || item.to === '/admin'}
                collapsed={railCollapsed}
                onNavigate={closeSidebarMobile}
                onExpandRequest={openSidebar}
              />
            ))}
          </nav>

          <div className="my-3 mx-auto h-px w-8 bg-[var(--shell-border)]" />

          <nav className="flex flex-col gap-1">
            {extraNav.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                collapsed={railCollapsed}
                onNavigate={closeSidebarMobile}
                onExpandRequest={openSidebar}
              />
            ))}
          </nav>
        </div>

        <div className={`mt-3 shrink-0 flex flex-col gap-2 ${railCollapsed ? 'items-center' : ''}`}>
          <div
            className={`flex items-center rounded-2xl bg-[var(--surface-muted)] border border-[var(--shell-border)] ${railCollapsed ? 'justify-center p-2 cursor-pointer' : 'gap-3 px-3 py-2.5'}`}
            title={railCollapsed ? 'Hover, tap, or drag right to expand sidebar' : `${user?.name || 'Admin'} · ${user?.role || 'ADMIN'}`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold"
              style={{
                background: 'linear-gradient(135deg,#00D4FF,#9B5DFF)',
                color: '#000',
                boxShadow: '0 0 20px rgba(0,212,255,0.4)',
              }}
            >
              {initials}
            </div>
            {!railCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user?.name || 'Admin'}</div>
                <div className="truncate text-[10px] tracking-wide text-[var(--text3)]">{user?.role || 'ADMIN'}</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
