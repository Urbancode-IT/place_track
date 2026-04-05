import { useState } from 'react';
import { useNotificationStore } from '@/store/notification.store';
import { Button } from '@/components/ui/Button';

function applyFormUrl() {
  return `${window.location.origin}/interview/apply`;
}

/** Same shared URL as dashboard — student enters email on the form */
export function StudentSelfInterviewLink({ children = null }) {
  const addToast = useNotificationStore((s) => s.addToast);
  const [lastUrl, setLastUrl] = useState('');

  const copyLink = () => {
    const url = applyFormUrl();
    setLastUrl(url);
    navigator.clipboard.writeText(url).catch(() => {});
    addToast({ message: 'Shared form link copied', type: 'success' });
  };

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-2 text-left sm:text-right w-full sm:w-auto sm:max-w-[min(100%,420px)]">
      <div className="flex flex-wrap gap-2 justify-stretch sm:justify-end items-center w-full">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={copyLink}
          className="!bg-[rgba(0,212,255,0.14)] !text-[var(--text)] border !border-[rgba(0,212,255,0.35)] hover:!bg-[rgba(0,212,255,0.22)] focus:ring-cyan-500/40 flex-1 sm:flex-none min-w-[9rem] justify-center"
        >
          Copy form link
        </Button>
        {children}
      </div>
      <p className="text-[11px] text-[var(--text2)] leading-snug w-full sm:max-w-[22rem]">
        Same link for everyone. Student uses their institute email on the form; you approve under Student submits.
      </p>
      {lastUrl && (
        <p className="text-[9px] font-mono text-[var(--text2)] break-all max-w-full">{lastUrl}</p>
      )}
    </div>
  );
}
