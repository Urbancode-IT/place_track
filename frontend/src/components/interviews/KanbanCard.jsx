/**
 * Single Kanban card for Interview Pipeline — colored role tags, trainer circles, clock + time.
 * Matches reference: neat cards with FSD/SDET/BI_DS/Network tags and small colored circles.
 */
const COURSE_TAG = {
  FSD: { bg: 'rgba(14, 165, 233, 0.25)', border: 'rgba(14, 165, 233, 0.5)', text: '#38bdf8' },
  SDET: { bg: 'rgba(249, 115, 22, 0.25)', border: 'rgba(249, 115, 22, 0.5)', text: '#fb923c' },
  SBET: { bg: 'rgba(249, 115, 22, 0.25)', border: 'rgba(249, 115, 22, 0.5)', text: '#fb923c' },
  BI_DS: { bg: 'rgba(34, 197, 94, 0.25)', border: 'rgba(34, 197, 94, 0.5)', text: '#4ade80' },
  NETWORKING: { bg: 'rgba(239, 68, 68, 0.25)', border: 'rgba(239, 68, 68, 0.5)', text: '#f87171' },
  Network: { bg: 'rgba(239, 68, 68, 0.25)', border: 'rgba(239, 68, 68, 0.5)', text: '#f87171' },
  AWS: { bg: 'rgba(251, 146, 60, 0.25)', border: 'rgba(251, 146, 60, 0.5)', text: '#fdba74' },
  JAVA: { bg: 'rgba(239, 68, 68, 0.25)', border: 'rgba(239, 68, 68, 0.5)', text: '#f87171' },
  REACT: { bg: 'rgba(6, 182, 212, 0.25)', border: 'rgba(6, 182, 212, 0.5)', text: '#22d3ee' },
};

const CIRCLE_COLORS = ['#0ea5e9', '#eab308', '#22c55e', '#a855f7', '#f43f5e', '#f97316'];

function getCourseStyle(course) {
  const key = (course || 'FSD').toString().toUpperCase().replace(/\s/g, '_');
  return COURSE_TAG[key] || COURSE_TAG.FSD;
}

function getCircleColor(index) {
  return CIRCLE_COLORS[index % CIRCLE_COLORS.length];
}

export function KanbanCard({ interview, columnAccent, onEdit }) {
  const course = interview.student?.course || 'FSD';
  const style = getCourseStyle(course);
  const trainers = (interview.trainers || [])
    .map((t) => t?.trainer)
    .filter(Boolean);
  const note =
    interview.status === 'SHORTLISTED'
      ? 'Cleared - Next round pending'
      : interview.status === 'SCHEDULED' && interview.notes
        ? 'Email sent'
        : interview.notes || null;

  return (
    <div
      className="rounded-xl p-3 space-y-2.5 min-h-[88px]"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top row: name + role tag + round */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-outfit text-[12px] font-medium text-[var(--text)] leading-tight truncate">
            {interview.student?.name || 'Unnamed student'}
          </p>
          <p className="font-mono text-[10px] text-[var(--text2)] mt-0.5 truncate">
            {interview.company}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="uppercase font-mono text-[9px] font-semibold px-2 py-0.5 rounded-md"
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              color: style.text,
            }}
          >
            {course}
          </span>
          {interview.round && (
            <span
              className="font-mono text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: `${columnAccent}22`,
                border: `1px solid ${columnAccent}44`,
                color: columnAccent,
              }}
            >
              {interview.round}
            </span>
          )}
        </div>
      </div>

      {/* Trainer circles + time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {trainers.slice(0, 3).map((t, idx) => (
            <span
              key={t?.id ?? idx}
              className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold text-white border border-white/20 shrink-0"
              style={{ background: getCircleColor(idx) }}
              title={t?.name}
            >
              {(t?.name || '?').slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text3)]">
          <span className="opacity-80" aria-hidden>🕐</span>
          <span>{interview.timeSlot || '—'}</span>
        </div>
      </div>

      {/* Optional note line */}
      {note && (
        <p className="font-mono text-[9px] text-[var(--text3)] flex items-center gap-1">
          {interview.status === 'SHORTLISTED' && (
            <span className="text-[var(--green)]" aria-hidden>✓</span>
          )}
          {note}
        </p>
      )}

      {onEdit && (
        <div className="pt-0.5 flex justify-end">
          <button
            type="button"
            className="text-[10px] font-mono text-primary hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(interview);
            }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
