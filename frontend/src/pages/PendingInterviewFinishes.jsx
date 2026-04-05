import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewFinishRequestApi } from '@/api/interviewFinishRequest.api';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useNotificationStore } from '@/store/notification.store';

export default function PendingInterviewFinishes() {
  const qc = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);

  const { data, isLoading } = useQuery({
    queryKey: ['interview-finish-requests'],
    queryFn: () => interviewFinishRequestApi.list().then((r) => r.data),
  });

  const rows = data?.data || [];

  const approveMut = useMutation({
    mutationFn: (id) => interviewFinishRequestApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interview-finish-requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['interviews'] });
      addToast({ message: 'Approved — interview status updated', type: 'success' });
    },
    onError: (e) => addToast({ message: e?.response?.data?.message || 'Approve failed', type: 'error' }),
  });

  const rejectMut = useMutation({
    mutationFn: (id) => interviewFinishRequestApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interview-finish-requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      addToast({ message: 'Rejected — interview unchanged', type: 'success' });
    },
    onError: (e) => addToast({ message: e?.response?.data?.message || 'Reject failed', type: 'error' }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-[var(--text)]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--violet)]">Queue</p>
          <h1 className="font-syne text-[20px] font-semibold">Interview finish submissions</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            New finish forms update the interview immediately. This queue only shows older items still marked submitted (if
            any). Approve to apply them, or reject to leave the interview unchanged.
          </p>
        </div>
        <Link to="/" className="text-sm text-[var(--cyan)] hover:underline">
          ← Dashboard
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-[var(--text3)] text-sm py-8">No pending finish submissions.</p>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text3)] font-mono text-[10px] uppercase tracking-wider border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="p-3">Student</th>
                <th className="p-3">Interview</th>
                <th className="p-3">Current</th>
                <th className="p-3">Proposed status</th>
                <th className="p-3">Proposed trainers</th>
                <th className="p-3">Feedback</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-3">
                    <Link className="text-[var(--cyan)] hover:underline" to={`/students/${r.studentId}`}>
                      {r.studentName}
                    </Link>
                    <div className="text-[10px] text-[var(--text3)]">{r.course}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.interviewCompany}</div>
                    <div className="text-[10px] text-[var(--text3)]">{r.interviewRound}</div>
                  </td>
                  <td className="p-3 text-[var(--text2)]">{r.currentInterviewStatus}</td>
                  <td className="p-3 font-mono text-[11px] text-[var(--violet)]">{r.proposedStatus}</td>
                  <td className="p-3 text-[var(--text2)] text-xs max-w-[220px]" title={r.proposedTrainersDisplay || ''}>
                    {r.proposedTrainersDisplay ?? '—'}
                  </td>
                  <td className="p-3 text-[var(--text2)] max-w-[200px] truncate" title={r.feedback || ''}>
                    {r.feedback || '—'}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={approveMut.isPending}
                      onClick={() => approveMut.mutate(r.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={rejectMut.isPending}
                      onClick={() => {
                        if (window.confirm('Reject this submission?')) rejectMut.mutate(r.id);
                      }}
                    >
                      Reject
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
