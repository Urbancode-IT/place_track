import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/store/notification.store';

export default function SyncZen() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const addToast = useNotificationStore((s) => s.addToast);

  const handleSync = () => {
    setSyncing(true);
    setProgress(0);
    
    // Mock sync progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncing(false);
          addToast({ type: 'success', message: 'Zen synchronization complete! All student records updated.' });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-bold">Sync Zen</h1>
        <p className="text-sm text-[var(--text2)]">Fetch the latest student data and batch updates from Zen Portal.</p>
      </div>

      <div className="glass-surface rounded-2xl p-8 max-w-2xl border border-[var(--border)]">
        <div className="flex items-center gap-6 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-[var(--cyan-glow)] flex items-center justify-center border border-[var(--cyan)]/30 backdrop-blur-xl">
             <svg className="h-8 w-8 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
             </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Zen Data Synchronization</h2>
            <p className="text-xs text-[var(--text3)]">Last synced: Today, 09:30 AM</p>
          </div>
        </div>

        {syncing ? (
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[var(--cyan)] uppercase tracking-widest animate-pulse">Synchronizing...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--purple)] transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-center text-[var(--text3)] italic">Updating student profiles, course status, and placement eligibility...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-[var(--text2)] leading-relaxed">
              Syncing with Zen will automatically pull new student enrollments, attendance status, and marks. 
              This ensures your <strong>Today&apos;s Live Interview Board</strong> and <strong>Student Submits</strong> always use the most up-to-date institute data.
            </p>
            <Button className="w-full sm:w-auto px-8" onClick={handleSync}>
              Start Synchronization Now
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <h3 className="text-xs font-bold text-[var(--text2)] uppercase mb-2">Connected Service</h3>
          <p className="text-sm font-mono text-[var(--cyan)]">Zen API v2.4 (Active)</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <h3 className="text-xs font-bold text-[var(--text2)] uppercase mb-2">Sync Mode</h3>
          <p className="text-sm font-mono text-[var(--green)]">Incrementally Safe</p>
        </div>
      </div>
    </div>
  );
}
