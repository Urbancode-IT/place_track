import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/**
 * In-app confirm dialog for removing an interview (replaces window.confirm).
 */
export function DeleteInterviewConfirmModal({
  open,
  onClose,
  onConfirm,
  isPending,
  description,
  detail,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Delete interview?" size="sm" variant="dark">
      <p className="text-sm text-[var(--text2)]">{description}</p>
      {detail ? (
        <p className="mt-3 rounded-lg border border-[var(--border)] bg-[rgba(0,0,0,0.2)] px-3 py-2 text-[12px] font-mono text-[var(--text)]">
          {detail}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="!border !border-[var(--border)] !bg-[rgba(255,255,255,0.06)] !text-[var(--text)] hover:!bg-[rgba(255,255,255,0.1)]"
        >
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={isPending} onClick={onConfirm}>
          {isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
}
