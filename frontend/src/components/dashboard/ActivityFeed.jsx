import { formatDate } from '@/utils/formatDate';

export function ActivityFeed({ items }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-syne text-[12px] font-semibold text-[var(--text)]">
          Activity Stream
        </span>
        <span className="font-mono text-[9px] text-[var(--text3)]">ALL</span>
      </div>
      <ul className="space-y-2 mt-1">
        {items?.slice(0, 10).map((a) => (
          <li key={a.id} className="flex gap-2 items-start text-[11px]">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
            <div className="flex-1">
              <div className="text-[var(--text)]">{a.message}</div>
              <div className="font-mono text-[9px] text-[var(--text3)]">
                {formatDate(a.timestamp, 'HH:mm')}
              </div>
            </div>
          </li>
        ))}
        {(!items || items.length === 0) && (
          <li className="text-[var(--text3)] text-[11px]">No recent activity</li>
        )}
      </ul>
    </div>
  );
}
