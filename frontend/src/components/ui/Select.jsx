import { forwardRef } from 'react';
import { cn } from '@/utils/helpers';

export const Select = forwardRef(function Select({ label, options, error, className, ...props }, ref) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text2)] mb-1">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'glass-input',
          error && 'border-danger',
          className
        )}
        {...props}
      >
        {options?.map((opt) => (
          <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
            {typeof opt === 'object' ? opt.label : opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
});
