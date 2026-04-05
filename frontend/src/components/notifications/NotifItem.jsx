import { formatDate } from '@/utils/formatDate';

export function NotifItem({ item }) {
  const icon = item.channel === 'EMAIL' ? '📧' : '🔔';
  return (
    <li
      className={`py-3 px-4 flex gap-3 ${
        !item.read ? 'bg-[rgba(0,212,255,0.08)]' : 'bg-transparent'
      }`}
    >
      <span className="text-[16px]">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[var(--text)]">{item.message}</p>
        <p className="text-[10px] text-[var(--text3)] mt-0.5">
          {formatDate(item.sentAt, 'MMM d, HH:mm')}
        </p>
      </div>
    </li>
  );
}
