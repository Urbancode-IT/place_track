import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { COURSE_COLORS } from '@/utils/constants';

export function ProfileHero({ student, actions = null }) {
  const latestInterview = student?.interviews?.[0];
  return (
    <div
      className="rounded-2xl border p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5 relative overflow-visible"
      style={{
        background:
          'linear-gradient(145deg, rgba(0,212,255,0.12), rgba(155,93,255,0.08), rgba(0,0,0,0.85))',
        borderColor: 'var(--border)',
        boxShadow: '0 26px 60px rgba(0,0,0,0.65)',
      }}
    >
      <div className="relative z-10">
        <Avatar src={student?.photoUrl} name={student?.name} size="lg" />
      </div>
      <div className="relative z-10 space-y-1 min-w-0 flex-1">
        <h1 className="font-syne text-[22px] font-semibold text-[var(--text)]">
          {student?.name}
        </h1>
        {student?.course && (
          <Badge className={COURSE_COLORS[student?.course]}>
            {student.course}
          </Badge>
        )}
        {latestInterview && (
          <p className="mt-2 text-[12px] text-[var(--text2)]">
            Latest · {latestInterview.company} — {latestInterview.status}
          </p>
        )}
        {student?.email && (
          <p className="text-[11px] text-[var(--text3)]">{student.email}</p>
        )}
      </div>

      {actions && (
        <div className="relative z-20 flex flex-wrap items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto sm:ml-auto">
          {actions}
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/3 rounded-2xl overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(0,212,255,0.3), transparent 55%)',
        }}
      />
    </div>
  );
}
