import { hydrateInterviewSlots, formatDateOnlyLabel, isValidHttpUrl } from '@/utils/jobApplication';

function StatusPill({ status }) {
  const received = status === 'received';
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider"
      style={
        received
          ? {
              color: 'var(--green)',
              background: 'rgba(0, 255, 163, 0.12)',
              border: '1px solid rgba(0, 255, 163, 0.28)',
            }
          : {
              color: 'var(--yellow)',
              background: 'rgba(255, 214, 10, 0.12)',
              border: '1px solid rgba(255, 214, 10, 0.28)',
            }
      }
    >
      {received ? 'Link received' : 'Link pending'}
    </span>
  );
}

export function InterviewSlotsSummary({ row, compact = false }) {
  const slots = hydrateInterviewSlots(row);
  if (!slots.length) {
    if ((row?.interviewsScheduled || 0) <= 0) return '—';
    return <span className="text-[var(--text3)]">{row.companyName || '—'}</span>;
  }

  const entryDate = row?.date;

  return (
    <div className="space-y-1.5 min-w-0">
      {slots.map((slot, index) => {
        const showDate = slot.date && slot.date !== entryDate;
        return (
          <div key={slot.id || index} className="min-w-0">
            <p className="truncate text-[var(--text)]" title={slot.companyName}>
              {slot.companyName || 'Interview'}
              {slot.timeSlot ? (
                <span className="text-[var(--text3)] font-normal">
                  {' '}
                  · {showDate ? `${formatDateOnlyLabel(slot.date, 'd MMM')} · ` : ''}
                  {slot.timeSlot}
                </span>
              ) : showDate ? (
                <span className="text-[var(--text3)]"> · {formatDateOnlyLabel(slot.date, 'd MMM')}</span>
              ) : null}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <StatusPill status={slot.linkStatus} />
              {!compact && isValidHttpUrl(slot.meetingLink) ? (
                <a
                  href={slot.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[var(--cyan)] hover:underline truncate"
                >
                  Open
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
