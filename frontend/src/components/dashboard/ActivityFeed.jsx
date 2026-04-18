import { useState } from 'react';
import { formatDate } from '@/utils/formatDate';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { useDeleteInterview } from '@/hooks/useInterviews';
import { DeleteInterviewConfirmModal } from '@/components/ui/DeleteInterviewConfirmModal';
import { cn } from '@/utils/helpers';

function TrashIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function ActivityFeed({ items }) {
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === 'ADMIN' || role === 'TRAINER';
  const del = useDeleteInterview();
  const addToast = useNotificationStore((s) => s.addToast);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: 'Interview removed' });
        setDeleteTarget(null);
      },
      onError: (e) =>
        addToast({
          type: 'error',
          message: e?.response?.data?.message || 'Could not delete interview',
        }),
    });
  };

  return (
    <>
    <div
      className="rounded-2xl p-4 flex flex-col"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-syne text-[12px] font-semibold text-[var(--text)]">
          Activity Stream
        </span>
        <span className="font-mono text-[9px] text-[var(--text3)]">ALL</span>
      </div>
      <ul className="space-y-2 mt-1">
        {items?.slice(0, 10).map((a) => (
          <li key={a.id} className="flex gap-2 items-start text-[11px]">
            <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--cyan)]" />
            <div className="flex-1 min-w-0">
              <div className="text-[var(--text)]">{a.message}</div>
              <div className="font-mono text-[9px] text-[var(--text3)]">
                {formatDate(a.timestamp, 'HH:mm')}
              </div>
            </div>
            {canDelete && (
              <button
                type="button"
                title="Delete interview"
                disabled={del.isPending}
                onClick={() => setDeleteTarget(a)}
                className={cn(
                  'shrink-0 rounded-md p-1.5 transition-colors',
                  'text-[var(--text3)] hover:text-[var(--pink)] hover:bg-[rgba(244,63,94,0.12)]',
                  'disabled:opacity-40 disabled:pointer-events-none'
                )}
              >
                <TrashIcon className="block" />
              </button>
            )}
          </li>
        ))}
        {(!items || items.length === 0) && (
          <li className="text-[var(--text3)] text-[11px]">No recent activity</li>
        )}
      </ul>
    </div>

    <DeleteInterviewConfirmModal
      open={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
      isPending={del.isPending}
      description="It will disappear from the schedule and activity. This cannot be undone."
      detail={deleteTarget?.message}
    />
    </>
  );
}
