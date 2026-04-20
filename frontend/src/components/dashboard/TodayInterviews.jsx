import { useMemo, useState } from 'react';
import { DeleteInterviewConfirmModal } from '@/components/ui/DeleteInterviewConfirmModal';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { STATUS_COLORS } from '@/utils/constants';
import { getEffectiveInterviewStatus } from '@/utils/interviewEffectiveStatus';
import { useDeleteInterview } from '@/hooks/useInterviews';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/utils/helpers';

const CIRCLE_COLORS = ['#0ea5e9', '#eab308', '#22c55e', '#a855f7', '#f43f5e', '#f97316'];

function getCircleColor(index) {
  return CIRCLE_COLORS[index % CIRCLE_COLORS.length];
}

function getInitial(name) {
  const n = (name || '').trim();
  return (n ? n[0] : '?').toUpperCase();
}

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

function CalendarIcon({ className }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function TodayInterviews({ interviews: initialInterviews, boardDate, onBoardDateChange }) {
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === 'ADMIN' || role === 'TRAINER';
  const del = useDeleteInterview();
  const addToast = useNotificationStore((s) => s.addToast);
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredInterviews = initialInterviews?.filter((i) => {
    if (filterCourse === 'ALL') return true;
    return (i.student?.course || i.course) === filterCourse;
  });

  // Detect overlapping time slots
  const clashes = new Set();
  const timeCounts = {};
  (initialInterviews || []).forEach((i) => {
    const t = String(i.timeSlot || '').toLowerCase().trim();
    if (t && t !== '—') {
      timeCounts[t] = (timeCounts[t] || 0) + 1;
    }
  });

  (initialInterviews || []).forEach((i) => {
    const t = String(i.timeSlot || '').toLowerCase().trim();
    if (timeCounts[t] > 1) {
      clashes.add(i.id);
    }
  });

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

  const courses = ['ALL', 'FSD', 'SDET', 'BI_DS', 'NETWORKING', 'AWS', 'JAVA', 'REACT'];
  const prettyDate = useMemo(() => {
    if (!boardDate) return '';
    const d = new Date(`${boardDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return boardDate;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [boardDate]);

  const deleteDetail = deleteTarget
    ? `${deleteTarget.student?.name || 'Student'} · ${deleteTarget.company || '—'} · ${deleteTarget.round || '—'}`
    : '';

  return (
    <>
    <div
      className="rounded-2xl overflow-hidden flex flex-col glass-surface"
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--green)' }}
            />
            <span className="font-syne text-[13px] font-semibold text-[var(--text)]">
              Today&apos;s Live Interview Board
            </span>
          </div>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--cyan)] focus:outline-none focus:border-[var(--cyan)] transition-all cursor-pointer hover:bg-[rgba(0,186,224,0.05)]"
          >
            {courses.map((c) => (
              <option key={c} value={c} className="bg-[#0f172a] text-white">
                {c === 'ALL' ? '⚡ ALL COURSES' : c}
              </option>
            ))}
          </select>
          <label
            className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--cyan)] cursor-pointer hover:bg-[rgba(0,186,224,0.05)]"
            title="Filter board by date"
          >
            <CalendarIcon className="opacity-90" />
            <input
              type="date"
              value={boardDate}
              onChange={(e) => onBoardDateChange?.(e.target.value)}
              className="bg-transparent outline-none text-[9px] uppercase tracking-wider text-[var(--cyan)]"
            />
          </label>
        </div>
        <span className="font-mono text-[9px] text-[var(--text3)] uppercase tracking-widest bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded-full">
          {prettyDate ? `${prettyDate} · ` : ''}{filteredInterviews?.length || 0} OF {initialInterviews?.length || 0}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-[11px]">
          <thead>
            <tr className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text3)]">
              <th className="px-4 py-2 text-left">Student</th>
              <th className="px-4 py-2 text-left">Round</th>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Trainers</th>
              <th className="px-4 py-2 text-left">Status</th>
              {canDelete && (
                <th className="px-4 py-2 text-right w-[1%] font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text3)]">
                  Delete
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredInterviews?.map((i, idx) => {
              const isClash = clashes.has(i.id);
              const pipelineStatus = getEffectiveInterviewStatus(i);
              return (
                <tr
                  key={i.id}
                  className={cn(
                    "border-t border-[rgba(255,255,255,0.03)] transition-colors",
                    isClash ? "bg-[rgba(244,63,94,0.1)] hover:bg-[rgba(244,63,94,0.15)]" : "hover:bg-[rgba(255,255,255,0.02)]"
                  )}
                >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-[12px] font-bold text-white/90 border border-white/10 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${getCircleColor(idx)}55, ${getCircleColor(idx)}22)`,
                      }}
                    >
                      {getInitial(i.student?.name)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/students/${i.student?.id}`}
                        className="font-outfit text-[12px] text-[var(--text)] hover:text-[var(--cyan)] truncate block"
                      >
                        {i.student?.name || 'Unnamed'}
                      </Link>
                      <div className="font-mono text-[9px] text-[var(--text2)] truncate">
                        {i.company} · {i.student?.course}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center justify-center font-mono text-[9px] px-2 py-0.5 rounded-md"
                    style={{
                      background: 'rgba(0,212,255,0.12)',
                      border: '1px solid rgba(0,212,255,0.25)',
                      color: 'var(--cyan)',
                    }}
                  >
                    {i.round || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-[var(--text3)]">
                  <div className="flex flex-col gap-1 items-start">
                    <span>{i.timeSlot || '—'}</span>
                    {isClash && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-[var(--pink)] text-white font-bold animate-pulse">
                        CLASH
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {(i.trainers || [])
                      .map((t) => t?.trainer)
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((t, tIdx) => (
                        <span
                          key={t?.id ?? tIdx}
                          className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[9px] font-bold text-black border border-white/20"
                          style={{
                            background: getCircleColor(tIdx),
                            boxShadow: '0 0 14px rgba(0,0,0,0.25)',
                          }}
                          title={t?.name}
                        >
                          {getInitial(t?.name)}
                        </span>
                      ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      STATUS_COLORS[pipelineStatus]?.bg + ' ' + STATUS_COLORS[pipelineStatus]?.text
                    }
                  >
                    {pipelineStatus}
                  </Badge>
                </td>
                {canDelete && (
                  <td className="px-4 py-3 text-right align-middle">
                    <button
                      type="button"
                      title="Delete interview"
                      disabled={del.isPending}
                      onClick={() => setDeleteTarget(i)}
                      className={cn(
                        'inline-flex items-center justify-center rounded-lg p-2 transition-colors',
                        'text-[var(--text3)] hover:text-[var(--pink)] hover:bg-[rgba(244,63,94,0.12)]',
                        'disabled:opacity-40 disabled:pointer-events-none'
                      )}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                )}
                </tr>
              );
            })}
            {(!initialInterviews || initialInterviews.length === 0) && (
              <tr>
                <td colSpan={canDelete ? 6 : 5} className="px-4 py-6 text-center text-[var(--text3)] text-[11px]">
                  No interviews for selected date
                </td>
              </tr>
            )}
            {initialInterviews?.length > 0 && filteredInterviews?.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 6 : 5} className="px-4 py-6 text-center text-[var(--text3)] text-[11px]">
                  No interviews found for the selected course
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    <DeleteInterviewConfirmModal
      open={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
      isPending={del.isPending}
      description="This interview will be removed from today’s board and the schedule. This cannot be undone."
      detail={deleteDetail}
    />
    </>
  );
}
