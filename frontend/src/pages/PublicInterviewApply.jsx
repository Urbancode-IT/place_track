import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { publicSelfInterviewApi } from '@/api/publicSelfInterview.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  studentEmail: z.string().email('Enter a valid email'),
  company: z.string().min(1),
  round: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  hrNumber: z.string().optional(),
  comments: z.string().optional(),
});

/**
 * Shared link for all students — same URL. Student enters institute email + interview details.
 */
export default function PublicInterviewApply() {
  const submitMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.apply(body).then((r) => r.data),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      studentEmail: '',
      company: '',
      round: '',
      date: '',
      timeSlot: '',
      hrNumber: '',
      comments: '',
    },
  });

  useEffect(() => {
    document.title = 'Interview form — PlaceTrack';
  }, []);

  if (submitMut.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center space-y-3"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <h1 className="font-syne text-xl font-semibold">Thank you</h1>
          <p className="text-sm text-[var(--text2)]">
            {submitMut.data?.message || 'Submitted. Your placement team will review it.'}
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = (values) => {
    submitMut.mutate({
      ...values,
      date: new Date(values.date).toISOString(),
    });
  };

  return (
    <div className="min-h-screen p-6 flex justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-8 space-y-6"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">PlaceTrack</p>
          <h1 className="mt-1 font-syne text-[22px] font-semibold">Interview details</h1>
          <p className="mt-2 text-sm text-[var(--text2)]">
            Use the <strong className="text-[var(--text)]">same email</strong> your institute saved for you. After
            submit, placement will approve — then it appears on their today&apos;s live board.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Your email (on file with institute)"
            type="email"
            autoComplete="email"
            {...register('studentEmail')}
            error={errors.studentEmail?.message}
          />
          <Input label="Company" {...register('company')} error={errors.company?.message} />
          <Input label="Round" placeholder="e.g. L1, Technical" {...register('round')} error={errors.round?.message} />
          <Input
            label="Interview date (as on your invite)"
            type="date"
            {...register('date')}
            error={errors.date?.message}
          />
          <p className="text-[10px] text-[var(--text3)] -mt-2">
            Reference for your team; schedule time is set when they approve.
          </p>
          <Input
            label="Time slot"
            showTimeIcon
            placeholder="e.g. 10:00 AM – 11:00 AM"
            {...register('timeSlot')}
            error={errors.timeSlot?.message}
          />
          <Input label="HR / contact (optional)" {...register('hrNumber')} />
          <div>
            <label className="block text-xs text-[var(--text2)] mb-1">Notes (optional)</label>
            <textarea
              className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(0,0,0,0.25)] border border-[var(--border)] text-[var(--text)]"
              rows={3}
              {...register('comments')}
            />
          </div>
          {submitMut.isError && (
            <p className="text-sm text-[var(--pink)]">
              {submitMut.error?.response?.data?.message || 'Could not submit. Check email and try again.'}
            </p>
          )}
          <Button type="submit" className="w-full" loading={submitMut.isPending}>
            Submit for approval
          </Button>
        </form>
      </div>
    </div>
  );
}
