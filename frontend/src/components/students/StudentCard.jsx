import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { COURSE_COLORS, STATUS_COLORS } from '@/utils/constants';
import {
  formatInterviewRoundAndSchedule,
  getEffectiveInterviewStatus,
  getEffectivePipelineLabel,
} from '@/utils/interviewEffectiveStatus';

function StudentCardInner({ student }) {
  const latestInterview = student.interviews?.[0];
  const eff = latestInterview ? getEffectiveInterviewStatus(latestInterview) : null;
  const pipelineLabel = latestInterview ? getEffectivePipelineLabel(latestInterview) : null;
  const whenLine = latestInterview ? formatInterviewRoundAndSchedule(latestInterview) : '';
  const company = String(latestInterview?.company || '').trim();

  return (
    <Link
      to={`/students/${student.id}`}
      className="block rounded-xl p-4 glass-surface hover:translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <Avatar src={student.photoUrl} name={student.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--text)] truncate">{student.name}</h3>
          <Badge className={COURSE_COLORS[student.course] || 'bg-gray-100'}>{student.course}</Badge>
          {eff && pipelineLabel && (
            <>
              <Badge className={`mt-1 ${STATUS_COLORS[eff]?.bg} ${STATUS_COLORS[eff]?.text}`}>
                {pipelineLabel}
              </Badge>
              {company ? (
                <p className="mt-1 text-xs font-medium text-[var(--text)] truncate" title={company}>
                  {company}
                </p>
              ) : null}
              <p className="mt-0.5 text-[11px] text-[var(--text2)] leading-snug line-clamp-2" title={whenLine}>
                {whenLine}
              </p>
            </>
          )}
          <p className="mt-3 text-xs font-medium text-[var(--cyan)]">Open profile →</p>
        </div>
      </div>
    </Link>
  );
}

export const StudentCard = memo(StudentCardInner);
