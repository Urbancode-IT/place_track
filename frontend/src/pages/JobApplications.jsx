import { useLocation, useNavigate } from 'react-router-dom';
import { DailyEntry } from '@/components/jobApplications/DailyEntry';
import { ApplicationHistory } from '@/components/jobApplications/ApplicationHistory';
import { useJobApplicationSpocs } from '@/hooks/useJobApplications';
import { useModulePath } from '@/lib/modulePath';

const VIEWS = [
  { id: 'daily', label: 'Daily Entry', path: '/job-applications' },
  { id: 'history', label: 'History', path: '/job-applications/history' },
];

export default function JobApplications() {
  const location = useLocation();
  const navigate = useNavigate();
  const to = useModulePath();
  const view = location.pathname.endsWith('/history') ? 'history' : 'daily';

  const { data: spocsRes, isLoading: spocsLoading } = useJobApplicationSpocs();
  const spocs = spocsRes?.data || [];

  return (
    <div className="space-y-4 text-[var(--text)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">Placement</p>
          <h1 className="text-[20px] font-medium">Job Applications</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            Rows saved on Daily Entry are stored in History, including today.
          </p>
        </div>

        <div className="job-apps-tab-row">
          {VIEWS.map((opt) => {
            const isActive = view === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => navigate(to(opt.path))}
                className="job-apps-tab transition-colors"
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, rgba(0,212,255,0.22), rgba(0,168,204,0.16))',
                        border: '1px solid rgba(0, 212, 255, 0.5)',
                        color: 'var(--cyan)',
                        boxShadow: '0 0 16px rgba(0, 212, 255, 0.18)',
                      }
                    : {
                        border: '1px solid var(--border)',
                        color: 'var(--text2)',
                      }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'daily' ? (
        <DailyEntry spocs={spocs} spocsLoading={spocsLoading} />
      ) : (
        <ApplicationHistory />
      )}
    </div>
  );
}
