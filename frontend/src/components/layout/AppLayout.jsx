import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUIStore } from '@/store/ui.store';

export default function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Sidebar />
      <div
        className={`relative min-h-screen flex flex-col transition-[margin] duration-200 ease-out ${sidebarCollapsed ? 'ml-[4.5rem]' : 'ml-64'}`}
      >
        <Topbar />
        <main className="flex-1 p-6 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
