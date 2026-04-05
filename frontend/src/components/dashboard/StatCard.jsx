import { cn } from '@/utils/helpers';

export function StatCard({ title, value, sub, progress, variant = 'mini', className }) {
  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between',
          className
        )}
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(155,93,255,0.05))',
          border: '1px solid rgba(0,212,255,0.18)',
          boxShadow: '0 0 40px rgba(0,212,255,0.18)',
        }}
      >
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--cyan)]">
            {title}
          </span>
          <span className="font-syne text-[42px] leading-none font-extrabold text-[var(--text)]">
            {value}
          </span>
          {sub && (
            <span className="font-outfit text-[11px] text-[var(--green)]">
              ↑ {sub}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl p-4 flex flex-col justify-between',
        className
      )}
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
      }}
    >
      <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--text3)]">
        {title}
      </span>
      <div className="mt-1">
        <span className="font-syne text-[26px] font-extrabold text-[var(--text)]">
          {value}
        </span>
      </div>
      {progress != null && (
        <div className="mt-2 h-[2px] w-full rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, progress)}%`,
              background: 'var(--green)',
            }}
          />
        </div>
      )}
    </div>
  );
}
