import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { publicSelfInterviewApi } from '@/api/publicSelfInterview.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/utils/helpers';
import { topicsForCourse, INTERVIEW_QA_TOPICS_DEFAULT } from '@/constants/interviewQaTopics';

const schema = z.object({
  studentEmail: z.string().email('Enter a valid email'),
  company: z.string().max(200).optional(),
  topic: z.string().min(1, 'Choose a topic'),
  question: z.string().trim().min(1, 'Enter the question').max(2000),
  answer: z.string().trim().min(1, 'Enter your answer').max(8000),
});

export default function PublicInterviewQuestions() {
  const [searchParams] = useSearchParams();
  const [savedCount, setSavedCount] = useState(0);
  const [topics, setTopics] = useState(INTERVIEW_QA_TOPICS_DEFAULT);
  const [studentLabel, setStudentLabel] = useState('');

  const prefillEmail = (searchParams.get('email') || '').trim();
  const prefillCompany = (searchParams.get('company') || '').trim();

  const metaMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.qaMeta(body).then((r) => r.data),
  });

  const submitMut = useMutation({
    mutationFn: (body) => publicSelfInterviewApi.submitQa(body).then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      studentEmail: prefillEmail,
      company: prefillCompany,
      topic: '',
      question: '',
      answer: '',
    },
  });

  useEffect(() => {
    document.title = 'Interview questions — PlaceTrack';
  }, []);

  useEffect(() => {
    if (!prefillEmail) return;
    metaMut.mutate(
      { studentEmail: prefillEmail },
      {
        onSuccess: (res) => {
          const d = res?.data;
          if (!d) return;
          setStudentLabel([d.studentName, d.course].filter(Boolean).join(' · '));
          const list = Array.isArray(d.topics) && d.topics.length ? d.topics : topicsForCourse(d.course);
          setTopics(list);
          setValue('topic', list[0] || '');
        },
        onError: () => {
          setTopics(INTERVIEW_QA_TOPICS_DEFAULT);
        },
      }
    );
  }, [prefillEmail]);

  const loadTopicsForEmail = () => {
    const email = getValues('studentEmail')?.trim();
    if (!email) return;
    metaMut.mutate(
      { studentEmail: email },
      {
        onSuccess: (res) => {
          const d = res?.data;
          if (!d) return;
          setStudentLabel([d.studentName, d.course].filter(Boolean).join(' · '));
          const list = Array.isArray(d.topics) && d.topics.length ? d.topics : topicsForCourse(d.course);
          setTopics(list);
          setValue('topic', list[0] || '');
          toast.success(`Topics loaded for ${d.course || 'your course'}`);
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || 'Could not find student for that email');
          setTopics(INTERVIEW_QA_TOPICS_DEFAULT);
        },
      }
    );
  };

  const onSubmit = (data) => {
    submitMut.mutate(
      {
        studentEmail: data.studentEmail.trim(),
        company: data.company?.trim() || undefined,
        topic: data.topic,
        question: data.question.trim(),
        answer: data.answer.trim(),
      },
      {
        onSuccess: () => {
          setSavedCount((n) => n + 1);
          toast.success('Question & answer saved. Add another if you want.');
          reset({
            studentEmail: data.studentEmail.trim(),
            company: data.company?.trim() || '',
            topic: data.topic,
            question: '',
            answer: '',
          });
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || 'Could not save question.');
        },
      }
    );
  };

  const finishLink = (() => {
    const params = new URLSearchParams();
    if (prefillEmail || getValues('studentEmail')) {
      params.set('email', prefillEmail || getValues('studentEmail'));
    }
    if (prefillCompany || getValues('company')) {
      params.set('company', prefillCompany || getValues('company') || '');
    }
    const q = params.toString();
    return q ? `/interview/finish?${q}` : '/interview/finish';
  })();

  return (
    <div className="min-h-screen p-6 flex justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-8 space-y-6"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[9px] tracking-[0.18em] uppercase text-[var(--violet)]">PlaceTrack</p>
          <h1 className="mt-1 text-[22px] font-medium">Please update your questions</h1>
          <p className="mt-2 text-sm text-[var(--text2)]">
            Enter <strong className="text-[var(--text)]">question and answer together</strong>, pick a topic, then
            save. Both are stored as one entry for admin / trainers to view.
          </p>
          {studentLabel && <p className="mt-2 text-xs text-[var(--cyan)]">{studentLabel}</p>}
          <div className="flex flex-wrap gap-3 mt-3">
            <Link
              to={finishLink}
              className="text-[10px] font-medium text-[var(--violet)] hover:text-white transition-colors bg-[rgba(155,93,255,0.1)] px-2 py-1 rounded-md border border-[rgba(155,93,255,0.2)]"
            >
              Update interview outcome →
            </Link>
          </div>
        </div>

        {savedCount > 0 && (
          <p className="text-sm text-[var(--cyan)]">
            {savedCount} question{savedCount === 1 ? '' : 's'} saved this session.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Your email (on file)"
            type="email"
            autoComplete="email"
            {...register('studentEmail')}
            error={errors.studentEmail?.message}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={metaMut.isPending}
            onClick={loadTopicsForEmail}
          >
            Load topics for my course
          </Button>
          <Input
            label="Company (optional)"
            placeholder="e.g. TCS"
            {...register('company')}
            error={errors.company?.message}
          />
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text2)]">Topic</label>
            <select
              {...register('topic')}
              className={cn(
                'w-full px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary',
                'glass-input text-[var(--text)]'
              )}
            >
              <option value="">Select topic</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.topic && <p className="mt-1 text-sm text-danger">{errors.topic.message}</p>}
            <p className="mt-1 text-[11px] text-[var(--text3)]">
              FSD example: Frontend, Backend, Database. Other courses get matching topics.
            </p>
          </div>
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.28)' }}
          >
            <p className="text-xs font-medium text-[var(--cyan)] uppercase tracking-wide">Q &amp; A (both required)</p>
            <div>
              <label className="block text-xs text-[var(--text2)] mb-1">Question</label>
              <textarea
                className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(0,0,0,0.25)] border border-[var(--border)] text-[var(--text)]"
                rows={3}
                placeholder="e.g. Explain React hooks / What is REST?"
                {...register('question')}
              />
              {errors.question && <p className="mt-1 text-sm text-danger">{errors.question.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-[var(--text2)] mb-1">Answer</label>
              <textarea
                className="w-full rounded-xl px-3 py-2 text-sm bg-[rgba(0,0,0,0.25)] border border-[var(--border)] text-[var(--text)]"
                rows={4}
                placeholder="Write what you answered…"
                {...register('answer')}
              />
              {errors.answer && <p className="mt-1 text-sm text-danger">{errors.answer.message}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full" loading={submitMut.isPending}>
            Save question &amp; answer
          </Button>
        </form>
      </div>
    </div>
  );
}
