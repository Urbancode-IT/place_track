import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicSelfInterviewApi } from '@/api/publicSelfInterview.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const schema = z.object({
  company: z.string().min(1),
  round: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  hrNumber: z.string().optional(),
  room: z.string().optional(),
  comments: z.string().optional(),
});

export default function PublicInterviewFill() {
  const { token } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-self-interview', token],
    queryFn: () => publicSelfInterviewApi.getMeta(token).then((r) => r.data),
    enabled: Boolean(token),
  });
  const meta = data?.data;

  const submitMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.submit(token, body).then((r) => r.data),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      company: '',
      round: '',
      date: '',
      timeSlot: '',
      hrNumber: '',
      room: '',
      comments: '',
    },
  });

  useEffect(() => {
    document.title = 'Interview details — PlaceTrack';
  }, []);

  if (!token) {
    return <p className="p-8 text-center text-[var(--text2)]">Invalid link.</p>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <p className="text-center text-[var(--pink)]">{error?.response?.data?.message || 'This link is not valid.'}</p>
      </div>
    );
  }

  if (submitMut.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center space-y-3"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <h1 className="font-syne text-xl font-semibold">Thank you</h1>
          <p className="text-sm text-[var(--text2)]">{submitMut.data?.message || 'Submitted. Your placement team will review it.'}</p>
        </div>
      </div>
    );
  }

  if (!meta?.canSubmit) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 space-y-3"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <h1 className="font-syne text-xl font-semibold">Hi {meta?.studentFirstName || 'there'}</h1>
          <p className="text-sm text-[var(--text2)]">{meta?.message || 'This link is no longer available for editing.'}</p>
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
            Hi {meta.studentFirstName}, fill this form with the interview details you have. After you submit, your
            placement team will approve it — then it shows on their live board for today. Use the{' '}
            <strong className="text-[var(--text)]">time slot</strong> field for when your interview is.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Company" {...register('company')} error={errors.company?.message} />
          <Input label="Round" placeholder="e.g. L1, Technical" {...register('round')} error={errors.round?.message} />
          <Input
            label="Interview date (as on your invite)"
            type="date"
            {...register('date')}
            error={errors.date?.message}
          />
          <p className="text-[10px] text-[var(--text3)] -mt-2">
            Stored for your team as reference; the official schedule line appears when they approve.
          </p>
          <Input
            label="Time slot"
            showTimeIcon
            placeholder="e.g. 10:00 AM – 11:00 AM"
            {...register('timeSlot')}
            error={errors.timeSlot?.message}
          />
          <Input label="HR / contact (optional)" {...register('hrNumber')} />
          <Input label="Room / link (optional)" {...register('room')} />
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
              {submitMut.error?.response?.data?.message || 'Could not submit. Try again.'}
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
