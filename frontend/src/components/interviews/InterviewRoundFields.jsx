import { Input } from '@/components/ui/Input';
import { INTERVIEW_ROUND_OPTIONS } from '@/constants/interviewRounds';

const SELECT_CLASS =
  'w-full glass-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary';

/**
 * Shared Round select + optional "Specify round" when Other — same UX on /interview/apply and token fill.
 */
export function InterviewRoundFields({ register, errors, watchRound }) {
  return (
    <>
      <div>
        <label className="block text-xs text-[var(--text2)] mb-1">Round</label>
        <select className={SELECT_CLASS} {...register('round')}>
          <option value="">Select Round</option>
          {INTERVIEW_ROUND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.round && <p className="mt-1 text-sm text-danger">{errors.round.message}</p>}
      </div>

      {watchRound === 'Other' && (
        <Input
          label="Specify Round Name"
          placeholder="e.g. Technical Interview 3"
          {...register('customRound')}
          error={errors.customRound?.message}
        />
      )}
    </>
  );
}
