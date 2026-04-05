import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { honestReviewApi } from '@/api/honestReview.api';
import { useNotificationStore } from '@/store/notification.store';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function HonestReviewLinkPage() {
  const addToast = useNotificationStore((s) => s.addToast);

  const commonUrl = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/honest-review` : '/honest-review'),
    []
  );

  const { data: listBody, isLoading: listLoading } = useQuery({
    queryKey: ['honest-reviews-recent'],
    queryFn: () => honestReviewApi.listRecent({ limit: 40 }).then((r) => r.data),
  });
  const recentRows = Array.isArray(listBody?.data) ? listBody.data : [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(commonUrl);
      addToast({ message: 'Link copied', type: 'success' });
    } catch {
      addToast({ message: 'Copy failed — select the link and copy manually', type: 'error' });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 text-[var(--text)]">
      <div>
        <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--violet)]">Students</p>
        <h1 className="mt-1 font-syne text-[22px] font-semibold">Honest review link</h1>
        <p className="mt-2 text-sm text-[var(--text2)]">
          One common link for everyone. Students open it, enter the <strong className="text-[var(--text)]">same email</strong> as in their profile, and submit their honest review (no login).
        </p>
        <p className="mt-2 text-xs text-[var(--text3)]">
          Reviews are stored on each student’s profile under <span className="text-[var(--cyan)]">Honest reviews</span>. The list below is a shortcut so you can see recent submissions without opening every profile.
        </p>
      </div>

      <div
        className="rounded-2xl border p-6 space-y-3"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-syne text-lg font-semibold">Copy &amp; share</h2>
        <p className="text-xs text-[var(--text3)]">Share this in WhatsApp, email, or class group.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={commonUrl}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[rgba(0,0,0,0.25)] px-3 py-2 text-sm font-mono text-[var(--text)]"
          />
          <Button type="button" variant="secondary" onClick={copy}>
            Copy
          </Button>
        </div>
      </div>

      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-syne text-lg font-semibold">Recent submissions</h2>
        {listLoading ? (
          <Spinner size="sm" />
        ) : recentRows.length === 0 ? (
          <p className="text-sm text-[var(--text3)]">No submissions yet, or none visible for your role.</p>
        ) : (
          <ul className="space-y-4">
            {recentRows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border p-4 text-sm"
                style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.15)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text3)]">
                  <span className="font-medium text-[var(--text)]">{row.studentName}</span>
                  <span>{format(new Date(row.createdAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {row.studentEmail && (
                  <p className="mt-0.5 text-[11px] font-mono text-[var(--text3)]">{row.studentEmail}</p>
                )}
                <p className="mt-2 whitespace-pre-wrap text-[var(--text2)]">{row.content}</p>
                <Link
                  to={`/students/${row.studentId}`}
                  className="mt-2 inline-block text-xs font-medium text-[var(--cyan)] hover:underline"
                >
                  Open student profile →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
