import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/api/notification.api';
import { enablePushNotifications } from '@/lib/pushNotifications';

export function ChannelToggles() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: () => notificationApi.getSettings().then((r) => r.data),
  });
  const update = useMutation({
    mutationFn: (d) => notificationApi.updateSettings(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const settings = data?.data || { email: true, push: true };
  const [local, setLocal] = useState(settings);
  const [pushStatus, setPushStatus] = useState(null);

  useEffect(() => {
    setLocal(settings);
  }, [data?.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key, value) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    update.mutate(next);
  };

  const setupPush = async () => {
    setPushStatus('Requesting permission...');
    try {
      const r = await enablePushNotifications();
      if (r.ok) setPushStatus('Push enabled on this device.');
      else setPushStatus(`Push not enabled: ${r.reason}`);
    } catch (e) {
      setPushStatus('Push not enabled: error');
    }
  };

  return (
    <div
      className="flex flex-wrap gap-4 p-4 rounded-2xl"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <label className="flex items-center gap-2 text-[12px] text-[var(--text2)]">
        <input
          type="checkbox"
          checked={local.email}
          onChange={(e) => toggle('email', e.target.checked)}
        />
        <span>Email</span>
      </label>
      <label className="flex items-center gap-2 text-[12px] text-[var(--text2)]">
        <input
          type="checkbox"
          checked={local.push}
          onChange={(e) => toggle('push', e.target.checked)}
        />
        <span>Push</span>
      </label>

      <button
        type="button"
        onClick={setupPush}
        className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-mono"
        style={{ background: 'var(--panel2)', border: '1px solid var(--border)' }}
      >
        Enable push on this device
      </button>

      {pushStatus && (
        <div className="w-full text-[11px] text-[var(--text3)]">
          {pushStatus}
        </div>
      )}
    </div>
  );
}
