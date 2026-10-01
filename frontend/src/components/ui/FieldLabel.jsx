import { cn } from '@/utils/helpers';

export function FieldLabel({ children, required = false, className, htmlFor }) {
  if (!children) return null;
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-sm font-medium mb-1 text-[var(--text2)]', className)}
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-[var(--pink)]" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}
