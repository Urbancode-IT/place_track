import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

function applyFormUrl() {
  return `${window.location.origin}/interview/apply`;
}

export function DashboardCreateStudentLink() {
  const role = useAuthStore((s) => s.user?.role);
  const addToast = useNotificationStore((s) => s.addToast);
  const [lastUrl, setLastUrl] = useState('');
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  if (role !== 'ADMIN') return null;

  const copyLink = async () => {
    const url = applyFormUrl();
    setLastUrl(url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* HTTP / permission */
    }
    addToast({ message: 'Form link copied — share with any student', type: 'success' });
    setCopyModalOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        className="!bg-[rgba(0,212,255,0.2)] !text-[var(--text)] border !border-[rgba(0,212,255,0.35)] hover:!bg-[rgba(0,212,255,0.28)]"
        onClick={copyLink}
      >
        Copy form link
      </Button>

      <Modal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        title="Link copied"
        size="sm"
        variant="dark"
      >
        <p className="text-sm text-[var(--text2)]">
          The student interview form URL is in your clipboard. Share it with students so they can submit details for
          approval.
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
