import { Link } from 'react-router-dom';
import { formatDate } from '@/utils/formatDate';
import { Badge } from '@/components/ui/Badge';
import { STATUS_COLORS, COURSE_COLORS } from '@/utils/constants';
import { getEffectiveInterviewStatus } from '@/utils/interviewEffectiveStatus';

export function ScheduleTable({ data, onStatusChange, onEdit }) {
  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      <table className="min-w-full divide-y divide-border">
        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">S.No</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Student</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Course</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Company</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Round</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Trainers</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">HR Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Room</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Trainer review</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text2)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-[var(--text)]">
          {data?.map((i, idx) => {
            const pipeline = getEffectiveInterviewStatus(i);
            return (
            <tr key={i.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
              <td className="px-4 py-2 text-sm">{idx + 1}</td>
              <td className="px-4 py-2">
                <Link to={`/students/${i.student?.id}`} className="text-primary hover:underline font-medium">
                  {i.student?.name}
                </Link>
              </td>
              <td className="px-4 py-2"><Badge className={COURSE_COLORS[i.student?.course]}>{i.student?.course}</Badge></td>
              <td className="px-4 py-2 text-sm">{i.company}</td>
              <td className="px-4 py-2 text-sm">{i.round}</td>
              <td className="px-4 py-2 text-sm">{i.timeSlot}</td>
              <td className="px-4 py-2 text-sm">{(i.trainers || []).map((t) => t.trainer?.name).join(', ')}</td>
              <td className="px-4 py-2 text-sm">{i.hrNumber || '-'}</td>
              <td className="px-4 py-2 text-sm">{i.room || '-'}</td>
              <td className="px-4 py-2">
                <select
                  value={i.status}
                  onChange={(e) => onStatusChange?.(i.id, e.target.value)}
                  className={`text-xs rounded px-2 py-1 border ${STATUS_COLORS[pipeline]?.bg} ${STATUS_COLORS[pipeline]?.text} bg-opacity-90`}
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="SELECTED">Selected</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="AWAITING_RESPONSE">Awaiting</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                  <option value="NO_RESPONSE">No Response</option>
                </select>
              </td>
              <td className="px-4 py-2 text-xs text-[var(--text2)] max-w-[140px]">
                {i.trainerReviewRating === 'EXCELLENT' && (
                  <span className="text-emerald-400">Excellent</span>
                )}
                {i.trainerReviewRating === 'GOOD' && <span className="text-sky-400">Good</span>}
                {i.trainerReviewRating === 'BAD' && <span className="text-rose-400">Bad</span>}
                {!i.trainerReviewRating && '—'}
                {(i.trainerReviewNotes || '').trim() ? (
                  <span className="block mt-0.5 text-[10px] text-[var(--text3)] truncate" title={i.trainerReviewNotes}>
                    {i.trainerReviewNotes}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2">
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => onEdit?.(i)}
                >
                  Edit
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
