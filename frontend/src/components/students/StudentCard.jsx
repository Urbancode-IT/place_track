import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { COURSE_COLORS, STATUS_COLORS } from '@/utils/constants';
import { getEffectiveInterviewStatus } from '@/utils/interviewEffectiveStatus';

export function StudentCard({ student }) {
  const latestInterview = student.interviews?.[0];
  const status = latestInterview ? getEffectiveInterviewStatus(latestInterview) : null;

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
          {status && (
            <Badge className={`mt-1 ${STATUS_COLORS[status]?.bg} ${STATUS_COLORS[status]?.text}`}>
              {status}
            </Badge>
          )}
          <p className="mt-3 text-xs font-medium text-[var(--cyan)]">Open profile →</p>
        </div>
      </div>
    </Link>
  );
}
