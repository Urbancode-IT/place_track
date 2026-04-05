import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '@/api/notification.api';
import { NotifList } from '@/components/notifications/NotifList';
import { ChannelToggles } from '@/components/notifications/ChannelToggles';
import { Button } from '@/components/ui/Button';

export default function Notifications() {
  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list().then((r) => r.data),
  });
  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount ?? 0;

  const readAll = async () => {
    await notificationApi.readAll();
    refetch();
  };

  return (
    <div className="space-y-5 text-[var(--text)]">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">
            04 ▸ Alerts Center
          </p>
          <h1 className="mt-1 font-syne text-[18px] font-semibold">Alerts & notifications</h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="font-mono text-[10px]"
          onClick={readAll}
        >
          Mark all as read
        </Button>
      </div>

      <ChannelToggles />

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <h2
          className="px-4 py-3 flex items-center justify-between border-b text-[12px]"
          style={{ borderColor: 'var(--border)' }}
        >
          <span>Alerts</span>
          {unreadCount > 0 && (
            <span className="font-mono text-[10px] text-[var(--cyan)]">
              {unreadCount} unread
            </span>
          )}
        </h2>
        <NotifList items={notifications} />
      </div>
    </div>
  );
}
