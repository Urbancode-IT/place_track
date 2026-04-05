import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

function finishFormUrl() {
  return `${window.location.origin}/interview/finish`;
}

export function DashboardInterviewFinishLink() {
  const role = useAuthStore((s) => s.user?.role);
  const addToast = useNotificationStore((s) => s.addToast);
  const [lastUrl, setLastUrl] = useState('');
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  if (role !== 'ADMIN') return null;

  const copyLink = async () => {
    const url = finishFormUrl();
    setLastUrl(url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* HTTP / permission */
    }
    addToast({ message: 'Interview finish link copied', type: 'success' });
    setCopyModalOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        className="!bg-[rgba(155,93,255,0.18)] !text-[var(--text)] border !border-[rgba(155,93,255,0.4)] hover:!bg-[rgba(155,93,255,0.26)]"
        onClick={copyLink}
      >
        Copy finish form link
      </Button>

      <Modal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        title="Link copied"
        size="sm"
        variant="dark"
      >
        <p className="text-sm text-[var(--text2)]">
          The interview finish form URL is in your clipboard. Students use it after the interview to report outcome — the
          schedule updates as soon as they submit.
        </p>
        {lastUrl && (
          <p className="mt-3 text-[11px] font-mono text-[var(--violet)] break-all rounded-lg p-2 bg-[rgba(155,93,255,0.1)] border border-[rgba(155,93,255,0.25)]">
            {lastUrl}
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={() => setCopyModalOpen(false)}
            className="!bg-[rgba(155,93,255,0.18)] !text-[var(--text)] border !border-[rgba(155,93,255,0.4)]"
          >
            OK
          </Button>
        </div>
      </Modal>
    </>
  );
}
