import { formatDate } from '@/utils/formatDate';
import { Badge } from '@/components/ui/Badge';
import { STATUS_COLORS } from '@/utils/constants';
import { cn } from '@/utils/helpers';

function trainerReviewLabel(rating) {
  if (rating === 'EXCELLENT') return 'Excellent';
  if (rating === 'GOOD') return 'Good';
  if (rating === 'BAD') return 'Bad';
  return null;
}

const TRAINER_REVIEW_BADGE = {
  EXCELLENT: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  GOOD: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  BAD: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function InterviewTimeline({ interviews }) {
  return (
    <ul className="space-y-3">
      {interviews?.map((i) => {
        const trLabel = trainerReviewLabel(i.trainerReviewRating);
        const trNotes = (i.trainerReviewNotes || '').trim();
        return (
        <li
          key={i.id}
          className="flex gap-3 border-l-2 border-border pl-4 py-1"
        >
          <div className="flex-1 space-y-1.5">
            <p className="font-medium text-[var(--text)]">{i.company}</p>
            <p className="text-[11px] text-[var(--text3)]">
              {i.round} • {formatDate(i.date)} {i.timeSlot}
            </p>
            <Badge
              className={
                (STATUS_COLORS[i.status]?.bg || '') +
                ' ' +
                (STATUS_COLORS[i.status]?.text || '')
              }
            >
              {i.status}
            </Badge>
            {(trLabel || trNotes) && (
              <div
                className="rounded-lg border px-2.5 py-2 text-[11px] space-y-1"
                style={{ borderColor: 'var(--border)', background: 'rgba(155,93,255,0.06)' }}
              >
                <p className="text-[10px] font-mono uppercase tracking-wide text-[var(--text3)]">
                  Student trainer review
                </p>
                {trLabel && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
                      TRAINER_REVIEW_BADGE[i.trainerReviewRating] || 'border-[var(--border)] text-[var(--text2)]'
                    )}
                  >
                    {trLabel}
                  </span>
                )}
                {trNotes && (
                  <p className="text-[var(--text2)] whitespace-pre-wrap leading-relaxed">{trNotes}</p>
                )}
              </div>
            )}
          </div>
        </li>
        );
      })}
      {(!interviews || interviews.length === 0) && (
        <li className="text-[var(--text3)] text-[12px]">No interviews yet</li>
      )}
    </ul>
  );
}
