import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { selfInterviewRequestApi } from '@/api/selfInterviewRequest.api';
import { trainerApi } from '@/api/trainer.api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useNotificationStore } from '@/store/notification.store';

export default function PendingSelfSubmits() {
  const qc = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);
  const [approveRow, setApproveRow] = useState(null);
  const [trainerIds, setTrainerIds] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['self-interview-requests', { status: 'SUBMITTED' }],
    queryFn: () => selfInterviewRequestApi.list({ status: 'SUBMITTED' }).then((r) => r.data),
  });
  const { data: trainersRes } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainerApi.list().then((r) => r.data),
    enabled: Boolean(approveRow),
  });

  const rows = data?.data || [];
  const trainers = (trainersRes?.data || []).map((t) => ({ value: t.id, label: t.name }));

  const approveMut = useMutation({
    mutationFn: ({ id, trainerIds: tids }) =>
      selfInterviewRequestApi.approve(id, { trainerIds: tids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-interview-requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['interviews'] });
      addToast({
        message: 'Approved — interview is on Today\'s Live Interview Board (dashboard)',
        type: 'success',
      });
      setApproveRow(null);
      setTrainerIds([]);
    },
    onError: (e) => addToast({ message: e?.response?.data?.message || 'Approve failed', type: 'error' }),
  });

  const rejectMut = useMutation({
    mutationFn: (id) => selfInterviewRequestApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-interview-requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      addToast({ message: 'Request rejected', type: 'success' });
    },
    onError: (e) => addToast({ message: e?.response?.data?.message || 'Reject failed', type: 'error' }),
  });

  const openApprove = (row) => {
    setTrainerIds([]);
    setApproveRow(row);
  };

  const confirmApprove = () => {
    if (!approveRow) return;
    approveMut.mutate({ id: approveRow.id, trainerIds });
  };

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
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text3)]">Queue</p>
          <h1 className="font-syne text-[20px] font-semibold">Student interview submissions</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            Students submit via the link you share from their profile. Approve to add a real interview to the schedule and dashboard.
          </p>
        </div>
        <Link to="/" className="text-sm text-[var(--cyan)] hover:underline">
          ← Dashboard
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-[var(--text3)] text-sm py-8">No pending submissions.</p>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text3)] font-mono text-[10px] uppercase tracking-wider border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="p-3">Student</th>
                <th className="p-3">Company</th>
                <th className="p-3">Round</th>
                <th className="p-3">When</th>
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
                  <td className="p-3">{r.company}</td>
                  <td className="p-3">{r.round}</td>
                  <td className="p-3 text-[var(--text2)]">
                    {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'} · {r.timeSlot || '—'}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => openApprove(r)}>
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

      <Modal
        open={Boolean(approveRow)}
        onClose={() => { setApproveRow(null); setTrainerIds([]); }}
        title="Approve submission"
        variant="dark"
      >
        <p className="text-sm text-[var(--text2)] mb-4">
          Creates the interview and lists it on <strong className="text-[var(--text)]">Today&apos;s Live Interview Board</strong>{' '}
          right away. Trainers receive the &quot;Interview scheduled&quot; email (and app notification). If you pick none below,
          <strong className="text-[var(--text)]"> all trainers</strong> are notified; if you pick specific trainers, only they get the email and are linked to this interview.
        </p>
        <MultiSelect
          label="Assign trainers (optional)"
          options={trainers}
          value={trainerIds}
          onChange={setTrainerIds}
          placeholder="Leave empty to notify all trainers, or select…"
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => { setApproveRow(null); setTrainerIds([]); }}>
            Cancel
          </Button>
          <Button loading={approveMut.isPending} onClick={confirmApprove}>
            Approve & add to schedule
          </Button>
        </div>
      </Modal>
    </div>
  );
}
