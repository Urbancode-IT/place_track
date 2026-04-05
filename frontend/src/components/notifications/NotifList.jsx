import { formatDate } from '@/utils/formatDate';
import { NotifItem } from './NotifItem';

export function NotifList({ items }) {
  return (
    <ul className="divide-y divide-[rgba(255,255,255,0.04)]">
      {items?.map((n) => (
        <NotifItem key={n.id} item={n} />
      ))}
      {(!items || items.length === 0) && (
        <li className="py-8 text-center text-[11px] text-[var(--text3)]">
          No notifications
        </li>
      )}
    </ul>
  );
}
