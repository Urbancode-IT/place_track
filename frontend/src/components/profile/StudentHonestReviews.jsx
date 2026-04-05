import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { honestReviewApi } from '@/api/honestReview.api';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';

export function StudentHonestReviews({ studentId }) {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading } = useQuery({
    queryKey: ['student-honest-reviews', studentId],
    queryFn: () => honestReviewApi.listByStudent(studentId).then((r) => r.data),
    enabled: (role === 'TRAINER' || role === 'ADMIN') && !!studentId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const rows = useMemo(() => {
    const payload = data?.data;
    return Array.isArray(payload) ? payload : [];
  }, [data]);

  if (role !== 'TRAINER' && role !== 'ADMIN') return null;

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      <div className="mb-4">
        <h3 className="font-syne text-[13px] font-semibold text-[var(--text)]">Honest reviews</h3>
        <p className="mt-1 text-xs text-[var(--text3)]">
          Shown here when the student uses the common <span className="text-[var(--text2)]">/honest-review</span> link with{' '}
          <strong className="text-[var(--text)]">this student’s profile email</strong>.
        </p>
      </div>
      {isLoading ? (
        <Spinner size="sm" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text3)]">
          No submissions yet. Share the common <span className="text-[var(--cyan)] font-semibold">Honest review</span> link from the sidebar
          so students can submit using their profile email.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border p-4 text-sm"
              style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--text3)]">
                <span>{format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[var(--text)]">{r.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
