import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { COURSE_COLORS, STATUS_COLORS } from '@/utils/constants';
import {
  getEffectiveInterviewStatus,
  getEffectivePipelineLabel,
} from '@/utils/interviewEffectiveStatus';
import { format, isValid, parseISO } from 'date-fns';
import { useModulePath } from '@/lib/modulePath';

function scheduleParts(interview) {
  if (!interview) return { round: '', when: '' };
  const round = String(interview.round || '').trim();
  let datePart = '';
  if (interview.date) {
    const d =
      typeof interview.date === 'string' ? parseISO(interview.date) : new Date(interview.date);
    if (isValid(d)) datePart = format(d, 'd MMM yyyy');
  }
  const slot = String(interview.timeSlot || '').trim();
  const when = [datePart, slot].filter(Boolean).join(' · ');
  return { round, when };
}

function StudentCardInner({ student }) {
  const to = useModulePath();
  const latestInterview = student.interviews?.[0];
  const eff = latestInterview ? getEffectiveInterviewStatus(latestInterview) : null;
  const pipelineLabel = latestInterview ? getEffectivePipelineLabel(latestInterview) : null;
  const company = String(latestInterview?.company || '').trim();
  const { round, when } = scheduleParts(latestInterview);

  return (
    <Link
      to={to(`/students/${student.id}`)}
      className="group block w-full rounded-2xl px-3 py-2.5 glass-surface transition-all duration-200 hover:border-[rgba(0,212,255,0.25)]"
    >
      <div className="flex items-center gap-2.5">
        <Avatar src={student.photoUrl} name={student.name} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-[13px] font-medium text-[var(--text)] truncate">{student.name}</h3>
            <Badge className={`shrink-0 !px-1.5 !py-0 text-[9px] ${COURSE_COLORS[student.course] || 'bg-gray-100'}`}>
              {student.course}
            </Badge>
            {eff && pipelineLabel && (
              <Badge className={`shrink-0 !px-1.5 !py-0 text-[9px] ${STATUS_COLORS[eff]?.bg} ${STATUS_COLORS[eff]?.text}`}>
                {pipelineLabel}
              </Badge>
            )}
          </div>

          {(company || when || round) && (
            <div className="mt-1 flex items-baseline justify-between gap-2 min-w-0">
              <p className="text-[11px] text-[var(--text2)] truncate min-w-0">
                {company || '—'}
                {round ? <span className="text-[var(--text3)]"> · {round}</span> : null}
              </p>
              {when ? (
                <p className="shrink-0 text-[10px] text-[var(--text3)] text-right tabular-nums" title={when}>
                  {when}
                </p>
              ) : null}
            </div>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-[var(--cyan)] opacity-70 group-hover:opacity-100 transition">
          →
        </span>
      </div>
    </Link>
  );
}

export const StudentCard = memo(StudentCardInner);
