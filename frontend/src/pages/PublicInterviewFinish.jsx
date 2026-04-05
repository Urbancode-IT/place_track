import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { publicSelfInterviewApi } from '@/api/publicSelfInterview.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/helpers';

const FINISH_STATUSES = [
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'SELECTED', label: 'Selected / Offer' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'AWAITING_RESPONSE', label: 'Awaiting response' },
  { value: 'NO_RESPONSE', label: 'No response' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

const TRAINER_REVIEW_OPTIONS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'BAD', label: 'Bad' },
  { value: 'EXCELLENT', label: 'Excellent' },
];

const schema = z
  .object({
    studentEmail: z.string().email('Enter a valid email'),
    company: z.string().min(1, 'Company name required'),
    proposedStatus: z.enum([
      'SHORTLISTED',
      'SELECTED',
      'REJECTED',
      'AWAITING_RESPONSE',
      'NO_RESPONSE',
      'RESCHEDULED',
    ]),
    feedback: z.string().optional(),
    trainerReviewRating: z.enum(['GOOD', 'BAD', 'EXCELLENT']).optional(),
    trainerReviewNotes: z.string().max(2000).optional(),
    trainerIds: z.array(z.string()).max(40).optional(),
    rescheduleDate: z.string().optional(),
    rescheduleTimeSlot: z.string().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.proposedStatus === 'RESCHEDULED') {
      if (!data.rescheduleDate?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose the new interview date',
          path: ['rescheduleDate'],
        });
      }
      if (!data.rescheduleTimeSlot?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter the new time or slot (e.g. 10:00 AM – 11:00 AM)',
          path: ['rescheduleTimeSlot'],
        });
      }
      return;
    }
    if (!data.trainerReviewRating) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose how your trainers supported you',
        path: ['trainerReviewRating'],
      });
    }
  });

export default function PublicInterviewFinish() {
  const [preview, setPreview] = useState(null);
  /** After “Check interview”, we send trainerIds with submit so they save with the outcome */
  const [lookupComplete, setLookupComplete] = useState(false);
  /** Trainers are read-only until user taps Edit on the match card */
  const [trainersEditable, setTrainersEditable] = useState(false);

  const previewMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.finishPreview(body).then((r) => r.data),
    onSuccess: (res) => {
      const d = res?.data || null;
      setPreview(d);
      setLookupComplete(!!d);
    },
    onError: () => {
      setPreview(null);
      setLookupComplete(false);
    },
  });

  const submitMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.finishApply(body).then((r) => r.data),
  });

  const { register, handleSubmit, formState: { errors }, getValues, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      studentEmail: '',
      company: '',
      proposedStatus: 'SHORTLISTED',
      feedback: '',
      trainerReviewRating: 'GOOD',
      trainerReviewNotes: '',
      trainerIds: undefined,
      rescheduleDate: '',
      rescheduleTimeSlot: '',
    },
  });

  const selectedTrainerIds = watch('trainerIds');
  const proposedStatus = watch('proposedStatus');

  useEffect(() => {
    document.title = 'Interview outcome — PlaceTrack';
  }, []);

  useEffect(() => {
    if (!preview) return;
    setTrainersEditable(false);
    const ids = (preview.trainers || []).map((t) => t.id).filter(Boolean);
    setValue('trainerIds', ids, { shouldValidate: true });
  }, [preview, setValue]);

  const runPreview = () => {
    const email = getValues('studentEmail');
    const company = getValues('company');
    if (!email?.trim() || !company?.trim()) return;
    previewMut.mutate({ studentEmail: email.trim(), company: company.trim() });
  };

  const clearLookup = () => {
    setPreview(null);
    setLookupComplete(false);
    setTrainersEditable(false);
    setValue('trainerIds', undefined);
    previewMut.reset();
  };

  const toggleTrainer = (id) => {
    if (!trainersEditable) return;
    const cur = getValues('trainerIds') || [];
    if (cur.includes(id)) {
      setValue(
        'trainerIds',
        cur.filter((x) => x !== id),
        { shouldValidate: true }
      );
    } else {
      setValue('trainerIds', [...cur, id], { shouldValidate: true });
    }
  };

  if (submitMut.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center space-y-3"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <h1 className="font-syne text-xl font-semibold">Thank you</h1>
          <p className="text-sm text-[var(--text2)]">
            {submitMut.data?.message || 'Your interview row on the schedule is updated.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-8 space-y-6"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--violet)]">PlaceTrack</p>
          <h1 className="mt-1 font-syne text-[22px] font-semibold">Interview finish</h1>
          <p className="mt-2 text-sm text-[var(--text2)]">
            Enter email + company, tap <strong className="text-[var(--text)]">Check interview</strong> to load the row.
            For most outcomes, add a <strong className="text-[var(--text)]">trainer review</strong> (Good / Bad / Excellent).
            If you pick <strong className="text-[var(--text)]">Rescheduled</strong>, only the new date and time are required.
            <strong className="text-[var(--text)]"> Submit</strong> updates the schedule. Tap <strong className="text-[var(--text)]">Edit</strong> on the match card to change trainers; use{' '}
            <strong className="text-[var(--text)]">Change email or company</strong> if the wrong row was matched.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            const payload = {
              studentEmail: data.studentEmail.trim(),
              company: data.company.trim(),
              proposedStatus: data.proposedStatus,
              feedback: data.feedback,
            };
            if (data.proposedStatus !== 'RESCHEDULED') {
              payload.trainerReviewRating = data.trainerReviewRating;
              payload.trainerReviewNotes = data.trainerReviewNotes?.trim() || undefined;
            }
            /* RHF sometimes omits setValue-only fields from `data` — use getValues + preview fallback */
            let trainerIdsPayload = data.trainerIds;
            if (!Array.isArray(trainerIdsPayload)) {
              trainerIdsPayload = getValues('trainerIds');
            }
            if (!Array.isArray(trainerIdsPayload) && preview?.trainers?.length) {
              trainerIdsPayload = preview.trainers.map((t) => t.id).filter(Boolean);
            }
            if (lookupComplete && Array.isArray(trainerIdsPayload)) {
              payload.trainerIds = trainerIdsPayload;
            }
            if (data.proposedStatus === 'RESCHEDULED') {
              payload.rescheduleDate = data.rescheduleDate?.trim();
              payload.rescheduleTimeSlot = data.rescheduleTimeSlot?.trim();
            }
            submitMut.mutate(payload);
          })}
          className="space-y-4"
        >
          <Input
            label="Your email (on file)"
            type="email"
            autoComplete="email"
            readOnly={!!preview}
            {...register('studentEmail')}
            error={errors.studentEmail?.message}
            className={preview ? 'opacity-80 cursor-not-allowed' : undefined}
          />
          <Input
            label="Company (as on schedule)"
            placeholder="e.g. TCS"
            readOnly={!!preview}
            {...register('company')}
            error={errors.company?.message}
            className={preview ? 'opacity-80 cursor-not-allowed' : undefined}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!!preview}
            loading={previewMut.isPending}
            onClick={runPreview}
          >
            Check interview
          </Button>
          {preview && (
            <p className="text-xs text-[var(--text3)] -mt-2">
              Tap <strong className="text-[var(--text2)]">Edit</strong> on the card to unlock trainer checkboxes. Use{' '}
              <strong className="text-[var(--text2)]">Change email or company</strong> on the card to pick a different match.
            </p>
          )}

          {previewMut.isError && (
            <p className="text-sm text-[var(--pink)]">
              {previewMut.error?.response?.data?.message || 'Could not find an interview.'}
            </p>
          )}

          {preview && (
            <div
              className="rounded-xl p-4 space-y-2 text-sm"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                <p className="font-semibold text-[var(--text)]">Matched: {preview.studentName}</p>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTrainersEditable(true)}
                    className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-lg transition-colors hover:opacity-90"
                    style={{
                      color: 'var(--cyan)',
                      border: '1px solid rgba(0,212,255,0.45)',
                      background: 'rgba(0,212,255,0.12)',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={clearLookup}
                    className="text-[10px] text-[var(--text3)] hover:text-[var(--cyan)] underline underline-offset-2"
                  >
                    Change email or company
                  </button>
                </div>
              </div>
              <p className="text-[var(--text2)]">
                <span className="text-[var(--cyan)]">{preview.interview?.company}</span>
                {' · '}
                {preview.interview?.round} · {preview.interview?.timeSlot} · status {preview.interview?.status}
              </p>
              <div>
                <p className="text-[10px] font-mono uppercase text-[var(--text3)] mb-1">
                  Trainers (select who should be on this interview)
                </p>
                <p className="text-[11px] text-[var(--text3)] mb-2">
                  {trainersEditable
                    ? 'Checked trainers are saved when you submit.'
                    : 'Tap Edit above to change trainers. Current list is shown below.'}
                </p>
                {(preview.trainerOptions || []).length ? (
                  <div
                    className={cn(
                      'max-h-44 overflow-y-auto rounded-lg p-2 space-y-2 transition-opacity',
                      !trainersEditable && 'opacity-75'
                    )}
                    style={{ border: '1px solid rgba(155,93,255,0.25)', background: 'rgba(0,0,0,0.2)' }}
                  >
                    {preview.trainerOptions.map((opt) => {
                      const checked = (selectedTrainerIds || []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            'flex items-center gap-2 text-sm text-[var(--text)]',
                            trainersEditable ? 'cursor-pointer' : 'cursor-default'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!trainersEditable}
                            onChange={() => toggleTrainer(opt.id)}
                            className="rounded border-[var(--border)] accent-[var(--violet)] disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                          <span>{opt.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[var(--text3)] text-xs">No trainers in the directory — contact placement.</span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text2)]">Outcome you want recorded</label>
            <select
              {...register('proposedStatus')}
              className={cn(
                'w-full px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary',
                'glass-input text-[var(--text)]'
              )}
            >
              {FINISH_STATUSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.proposedStatus && (
              <p className="mt-1 text-sm text-danger">{errors.proposedStatus.message}</p>
            )}
          </div>

          {proposedStatus === 'RESCHEDULED' && (
            <div
              className="space-y-3 rounded-xl p-4"
              style={{ background: 'rgba(155,93,255,0.08)', border: '1px solid rgba(155,93,255,0.28)' }}
            >
              <p className="text-xs font-medium text-[var(--text2)]">New schedule (required for rescheduled)</p>
              <Input
                label="New interview date"
                type="date"
                {...register('rescheduleDate')}
                error={errors.rescheduleDate?.message}
              />
              <Input
                label="New time / slot"
                showTimeIcon
                placeholder="e.g. 10:00 AM – 11:00 AM or 2–5 PM"
                {...register('rescheduleTimeSlot')}
                error={errors.rescheduleTimeSlot?.message}
              />
            </div>
          )}

          {proposedStatus !== 'RESCHEDULED' && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(155,93,255,0.08)', border: '1px solid rgba(155,93,255,0.28)' }}
            >
              <p className="text-sm font-medium text-[var(--text)]">Trainer review</p>
              <p className="text-xs text-[var(--text3)]">How was trainer support for this interview? (Required)</p>
              <div className="flex flex-wrap gap-2">
                {TRAINER_REVIEW_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors',
                      watch('trainerReviewRating') === opt.value
                        ? 'border-[var(--violet)] bg-[rgba(155,93,255,0.18)] text-[var(--text)]'
                        : 'border-[var(--border)] bg-[rgba(0,0,0,0.2)] text-[var(--text2)] hover:border-[var(--text3)]'
                    )}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      className="accent-[var(--violet)]"
                      {...register('trainerReviewRating')}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {errors.trainerReviewRating && (
                <p className="text-sm text-danger">{errors.trainerReviewRating.message}</p>
              )}
              <div>
                <label className="block text-xs text-[var(--text2)] mb-1">Trainer review notes (optional)</label>
                <textarea
                  className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(0,0,0,0.25)] border border-[var(--border)] text-[var(--text)]"
                  rows={3}
                  placeholder="Anything specific about mock prep, communication, follow-ups…"
                  {...register('trainerReviewNotes')}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-[var(--text2)] mb-1">Round notes / feedback (optional)</label>
            <textarea
              className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(0,0,0,0.25)] border border-[var(--border)] text-[var(--text)]"
              rows={4}
              placeholder="What happened in the round, next steps…"
              {...register('feedback')}
            />
          </div>

          {submitMut.isError && (
            <p className="text-sm text-[var(--pink)]">
              {submitMut.error?.response?.data?.message || 'Could not submit.'}
            </p>
          )}

          <Button type="submit" className="w-full" loading={submitMut.isPending}>
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
