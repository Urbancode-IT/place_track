import { parseISO, startOfDay, isBefore, isAfter } from 'date-fns';
import { formatDate } from '@/utils/formatDate';
import { Badge } from '@/components/ui/Badge';
import { STATUS_COLORS } from '@/utils/constants';
import { getEffectiveInterviewStatus } from '@/utils/interviewEffectiveStatus';
import { cn } from '@/utils/helpers';

/** Calendar day vs today (local). */
function calendarPhase(dateVal) {
  if (!dateVal) return 'unknown';
  const d = startOfDay(typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal));
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return 'past';
  if (isAfter(d, today)) return 'future';
  return 'today';
}

/** Raw DB status or trainer review — signals someone updated the row after the slot. */
function hasOutcomeOrTrainerReview(i) {
  const raw = String(i.status || '').trim();
  if (raw && raw !== 'SCHEDULED') return true;
  if (i.trainerReviewRating) return true;
  return !!(i.trainerReviewNotes || '').trim();
}

function slotFollowUpHint(i) {
  const phase = calendarPhase(i.date);
  if (phase === 'future') {
    return { text: 'Upcoming slot', tone: 'neutral' };
  }
  if (phase === 'today') {
    return { text: "Today's slot", tone: 'neutral' };
  }
  if (phase === 'unknown') {
    return { text: '', tone: 'neutral' };
  }
  if (hasOutcomeOrTrainerReview(i)) {
    return {
      text: 'Past slot · outcome or trainer review on file',
      tone: 'ok',
    };
  }
  return {
    text: 'Past slot · no update in app (cannot confirm attendance)',
    tone: 'warn',
  };
}

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
        const pipeline = getEffectiveInterviewStatus(i);
        const followUp = slotFollowUpHint(i);
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
                (STATUS_COLORS[pipeline]?.bg || '') +
                ' ' +
                (STATUS_COLORS[pipeline]?.text || '')
              }
            >
              {pipeline}
            </Badge>
            {followUp.text && (
              <p
                title="Place Track does not record physical check-ins. Use outcome status or trainer review to confirm follow-up."
                className={cn(
                  'text-[10px] font-mono leading-snug max-w-md',
                  followUp.tone === 'warn' && 'text-amber-400/90',
                  followUp.tone === 'ok' && 'text-emerald-400/85',
                  followUp.tone === 'neutral' && 'text-[var(--text3)]'
                )}
              >
                {followUp.text}
              </p>
            )}
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
