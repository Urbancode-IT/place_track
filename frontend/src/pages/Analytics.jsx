import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { dashboardApi } from '@/api/dashboard.api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Spinner } from '@/components/ui/Spinner';

const PIE_COLORS = ['#5B5FED', '#12B76A', '#F79009', '#F04438', '#0EA5E9', '#8B5CF6'];

export default function Analytics() {
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const ready = hydrated && !!accessToken;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: () => dashboardApi.analytics().then((r) => r.data),
    enabled: ready,
  });

  const analytics = data?.data || {};
  const statusData = analytics.statusDistribution?.map((s, i) => ({ name: s.status, value: s._count?.id ?? 0 })) || [];
  const placementTrend = analytics.placementTrend?.map((m) => ({ month: m.month, count: m.count })) || [];
  const topCompanies = analytics.topCompanies || [];
  const trainerPerf = analytics.trainerPerformance || [];
  const axisTick = { fontSize: 11, fill: 'var(--text2)' };
  const tooltipStyle = {
    background: 'rgba(10,13,24,0.92)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'var(--text)',
  };
  const tooltipLabelStyle = { color: 'var(--text2)' };

  if (!ready || isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[var(--text)]">
      <h1 className="text-2xl font-bold text-[var(--text)]">Analytics</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold mb-4 text-[var(--text)]">Status distribution</h3>
          {statusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-[var(--text2)]">No data</p>
          )}
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold mb-4 text-[var(--text)]">Placement trend</h3>
          {placementTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={placementTrend}>
                  <XAxis dataKey="month" tick={axisTick} axisLine={{ stroke: 'var(--border)' }} tickLine={{ stroke: 'var(--border)' }} />
                  <YAxis tick={axisTick} axisLine={{ stroke: 'var(--border)' }} tickLine={{ stroke: 'var(--border)' }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                  <Line type="monotone" dataKey="count" stroke="#5B5FED" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-[var(--text2)]">No data</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold mb-4 text-[var(--text)]">Top companies (selected)</h3>
          <ul className="space-y-2">
            {topCompanies.map((c) => (
              <li key={c.company} className="flex justify-between">
                <span className="text-[var(--text2)]">{c.company}</span>
                <span className="font-medium text-[var(--text)]">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold mb-4 text-[var(--text)]">Trainer performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-[var(--text)]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-[var(--text2)]">Trainer</th>
                  <th className="text-right py-2 text-[var(--text2)]">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {trainerPerf.map((t) => (
                  <tr key={t.trainerId} className="border-b border-border">
                    <td className="py-2">{t.trainerName}</td>
                    <td className="text-right py-2">{t.assignedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
