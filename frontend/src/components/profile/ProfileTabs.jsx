import { cn } from '@/utils/helpers';

const TABS = ['Overview', 'Resume', 'Self Intro', 'Q&A', 'Schedule History', 'Notes'];

export function ProfileTabs({ active, onChange }) {
  return (
    <div className="flex gap-2 border-b border-border overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
            active === tab
              ? 'border-[var(--cyan)] text-[var(--cyan)]'
              : 'border-transparent text-[var(--text2)] hover:text-[var(--text)]'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
