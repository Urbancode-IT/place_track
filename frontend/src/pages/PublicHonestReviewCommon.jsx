import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicHonestReviewApi } from '@/api/publicHonestReview.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
  content: z.string().min(10, 'Write at least 10 characters').max(8000),
});

export default function PublicHonestReviewCommon() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-honest-review-common'],
    queryFn: () => publicHonestReviewApi.getCommonMeta().then((r) => r.data),
  });
  const meta = data?.data;

  const submitMut = useMutation({
    mutationFn: (body) => publicHonestReviewApi.submitCommon(body).then((r) => r.data),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', content: '' },
  });

  useEffect(() => {
    document.title = 'Honest review — PlaceTrack';
  }, []);

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
        <p className="text-center text-[var(--pink)]">{error?.response?.data?.message || 'Could not load this page.'}</p>
      </div>
    );
  }

  if (submitMut.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div
          className="max-w-lg w-full rounded-2xl p-8 text-center space-y-3"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <h1 className="font-syne text-xl font-semibold">Thank you</h1>
          <p className="text-sm text-[var(--text2)]">
            {submitMut.data?.message || 'Your honest review was submitted.'}
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = (values) => {
    submitMut.mutate({ email: values.email.trim(), content: values.content.trim() });
  };

  return (
    <div className="min-h-screen p-6 flex justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl border p-8 space-y-6"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--violet)]">PlaceTrack</p>
          <h1 className="mt-2 font-syne text-2xl font-semibold">Honest review</h1>
          <p className="mt-2 text-sm text-[var(--text2)]">
            {meta?.message || 'Use your registered email, then share your honest reflection.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email (same as your student profile)"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text2)]">Your honest review</label>
            <textarea
              {...register('content')}
              rows={14}
              placeholder="Strengths, gaps, what you’ll improve next, how you handle feedback…"
              className="w-full rounded-xl border border-[var(--border)] bg-[rgba(0,0,0,0.25)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text3)] min-h-[280px]"
            />
            {errors.content && <p className="mt-1 text-sm text-danger">{errors.content.message}</p>}
          </div>

          <Button type="submit" loading={submitMut.isPending} className="w-full sm:w-auto">
            Submit honest review
          </Button>
          {submitMut.isError && (
            <p className="text-sm text-danger">{submitMut.error?.response?.data?.message || 'Submit failed'}</p>
          )}
        </form>
      </div>
    </div>
  );
}
