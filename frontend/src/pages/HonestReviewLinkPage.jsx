import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { honestReviewApi } from '@/api/honestReview.api';
import { useNotificationStore } from '@/store/notification.store';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

export default function HonestReviewLinkPage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [lastUrl, setLastUrl] = useState('');
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  const commonUrl = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/honest-review` : '/honest-review'),
    []
  );

  const { data: listBody, isLoading: listLoading } = useQuery({
    queryKey: ['honest-reviews-recent'],
    queryFn: () => honestReviewApi.listRecent({ limit: 40 }).then((r) => r.data),
  });
  const recentRows = Array.isArray(listBody?.data) ? listBody.data : [];

  const copyLink = async () => {
    setLastUrl(commonUrl);
    try {
      await navigator.clipboard.writeText(commonUrl);
    } catch {
      /* clipboard API / permission */
    }
    addToast({ message: 'Honest review link copied — share with students', type: 'success' });
    setCopyModalOpen(true);
  };

  return (
    <>
    <div className="mx-auto max-w-3xl space-y-8 text-[var(--text)]">
      <div>
        <h1 className="font-syne text-[22px] font-semibold">Honest review link</h1>
      </div>

      <div>
        <Button
          type="button"
          className="!bg-[rgba(0,212,255,0.2)] !text-[var(--text)] border !border-[rgba(0,212,255,0.35)] hover:!bg-[rgba(0,212,255,0.28)]"
          onClick={copyLink}
        >
          Copy review link
        </Button>
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

    <Modal
      open={copyModalOpen}
      onClose={() => setCopyModalOpen(false)}
      title="Link copied"
      size="sm"
      variant="dark"
    >
      <p className="text-sm text-[var(--text2)]">
        The honest review page URL is in your clipboard. Students use the same email as their profile — no login
        required.
      </p>
      {lastUrl && (
        <p className="mt-3 text-[11px] font-mono text-[var(--cyan)] break-all rounded-lg p-2 bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)]">
          {lastUrl}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          onClick={() => setCopyModalOpen(false)}
          className="!bg-[rgba(0,212,255,0.2)] !text-[var(--text)] border !border-[rgba(0,212,255,0.35)]"
        >
          OK
        </Button>
      </div>
    </Modal>
    </>
  );
}
