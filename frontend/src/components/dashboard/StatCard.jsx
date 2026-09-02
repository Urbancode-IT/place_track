import { useId } from 'react';
import { cn } from '@/utils/helpers';

function ProgressRing({ progress, size = 56 }) {
  const gradId = useId();
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, progress) / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#9d50bb" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--track-bg)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.5))' }}
      />
    </svg>
  );
}

export function StatCard({ title, value, sub, progress, variant = 'mini', className }) {
  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[20px] p-5 flex flex-col justify-between glass-surface glass-surface-glow',
          className
        )}
      >
        <div className="flex flex-col gap-2">
          <span className="text-[10px] tracking-[0.16em] uppercase text-[var(--cyan)] font-medium">
            {title}
          </span>
          <span className="text-[42px] leading-none font-bold text-[var(--text)]">
            {value}
          </span>
          {sub && (
            <span className="text-[12px] text-[var(--green)] font-medium">
              ↑ {sub}
            </span>
          )}
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-12 opacity-40"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)',
            maskImage: 'linear-gradient(to top, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-[20px] p-4 flex flex-col justify-between glass-surface',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] tracking-[0.14em] uppercase text-[var(--text3)] font-medium">
          {title}
        </span>
        {progress != null && progress > 0 && (
          <ProgressRing progress={progress} size={48} />
        )}
      </div>
      <div className="mt-2">
        <span className="text-[28px] font-bold text-[var(--text)] leading-none">
          {value}
        </span>
      </div>
      {progress != null && (
        <div className="mt-3 h-[3px] w-full rounded-full overflow-hidden bg-[var(--track-bg)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, progress)}%`,
              background: 'linear-gradient(90deg, #00d2ff, #9d50bb)',
              boxShadow: '0 0 8px rgba(0,212,255,0.5)',
            }}
          />
        </div>
      )}
    </div>
  );
}
