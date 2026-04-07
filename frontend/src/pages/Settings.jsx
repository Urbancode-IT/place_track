import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { systemApi } from '@/api/system.api';
import { useAuthStore } from '@/store/auth.store';
import { Spinner } from '@/components/ui/Spinner';

export default function Settings() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['system', 'mail-status'],
    queryFn: () => systemApi.mailStatus().then((r) => r.data),
  });

  const payload = data?.data;
  const mail = payload?.mail;
  const trainersWithoutEmail = payload?.trainersWithoutEmail;

  const ok = mail?.configured && mail?.verified;

  return (
    <div className="space-y-6 text-[var(--text)]">
      <div>
        <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">Settings</p>
        <h1 className="font-syne text-[22px] font-semibold">Workspace</h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Notification toggles live on the <Link to="/notifications" className="text-[var(--cyan)] hover:underline">Notifications</Link> page.
        </p>
      </div>

      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        <h2 className="font-syne text-sm font-semibold">Email delivery (trainers)</h2>
        <p className="text-xs text-[var(--text3)] leading-relaxed">
          Interview emails use SMTP from <span className="font-mono text-[var(--text2)]">placetrack/backend/.env</span>. If mail never arrives, check this first.
        </p>

        {isLoading && (
          <div className="flex justify-center py-6">
            <Spinner size="sm" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-[var(--pink)]">Could not load mail status. Is the backend running on port 5001?</p>
        )}

        {!isLoading && !isError && mail && (
          <ul className="text-sm space-y-2 font-mono text-[12px]">
            <li className="flex flex-wrap gap-2">
              <span className="text-[var(--text3)]">SMTP configured:</span>
              <span className={mail.configured ? 'text-[var(--green)]' : 'text-[var(--pink)]'}>
                {mail.configured ? 'yes' : 'no — set SMTP_USER & SMTP_PASS'}
              </span>
            </li>
            <li className="flex flex-wrap gap-2">
              <span className="text-[var(--text3)]">SMTP verified:</span>
              <span className={mail.verified ? 'text-[var(--green)]' : 'text-[var(--pink)]'}>
                {mail.verified ? 'yes' : 'no'}
              </span>
            </li>
            {mail.host && (
              <li className="text-[var(--text2)]">
                Host: {mail.host}:{mail.port} · From account: {mail.user || '—'}
              </li>
            )}
            {mail.verifyError && (
              <li className="text-[var(--pink)] text-[11px] leading-snug whitespace-pre-wrap">
                {mail.verifyError}
              </li>
            )}
          </ul>
        )}

        {role === 'ADMIN' && !isLoading && !isError && trainersWithoutEmail != null && (
          <p className="text-xs text-[var(--text2)] border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            Trainers with <strong className="text-[var(--text)]">no email</strong> in the database:{' '}
            <span className={trainersWithoutEmail > 0 ? 'text-[var(--yellow)]' : 'text-[var(--green)]'}>
              {trainersWithoutEmail}
            </span>
            {trainersWithoutEmail > 0 && (
              <>
                {' '}
                — add emails under <Link to="/trainers" className="text-[var(--cyan)] hover:underline">Trainers</Link>.
              </>
            )}
          </p>
        )}

        {!isLoading && !isError && !ok && (
          <p className="text-xs text-[var(--text2)] leading-relaxed">
            After fixing <span className="font-mono">.env</span>, restart the backend. Gmail needs an{' '}
            <strong className="text-[var(--text)]">App Password</strong>, not your normal password.
          </p>
        )}
      </div>
    </div>
  );
}
