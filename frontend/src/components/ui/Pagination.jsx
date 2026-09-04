import { Button } from './Button';

export function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="bg-[var(--surface-muted)] text-white border border-[var(--shell-border)] hover:bg-[var(--surface-hover)]"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-[var(--text2)]">
        Page {page} of {totalPages || 1}
      </span>
      <Button
        variant="secondary"
        size="sm"
        className="bg-[var(--surface-muted)] text-white border border-[var(--shell-border)] hover:bg-[var(--surface-hover)]"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
