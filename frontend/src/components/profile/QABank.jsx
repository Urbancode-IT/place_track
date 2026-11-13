import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '@/api/student.api';
import { qaApi } from '@/api/qa.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { QA_STATUS } from '@/utils/constants';
import { toast } from '@/components/ui/Toast';

export function QABank({ studentId }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentApi.getById(studentId).then((r) => r.data),
    enabled: !!studentId,
  });
  const addQa = useMutation({
    mutationFn: (body) => studentApi.addQa(studentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', studentId] });
      toast.success('Q&A added');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add Q&A');
    },
  });
  const updateQa = useMutation({
    mutationFn: ({ id, data: d }) => qaApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', studentId] });
      toast.success('Q&A status updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update Q&A');
    },
  });
  const deleteQa = useMutation({
    mutationFn: (id) => qaApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', studentId] });
      toast.success('Q&A deleted');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete Q&A');
    },
  });

  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const qa = data?.data?.qaEntries || [];
  const sortedQa = [...qa].sort((a, b) => {
    const aInt = /·|Interview:/i.test(String(a.category || '')) ? 0 : 1;
    const bInt = /·|Interview:/i.test(String(b.category || '')) ? 0 : 1;
    if (aInt !== bInt) return aInt - bInt;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const handleAdd = () => {
    if (!newQ.trim()) return;
    addQa.mutate({ question: newQ.trim(), answer: newA.trim() });
    setNewQ('');
    setNewA('');
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text3)]">
        Questions students submit after an interview are saved here (tagged{' '}
        <span className="text-[var(--cyan)]">Company · Topic</span>, e.g. TCS · Frontend). View and update below.
      </p>
      <div className="flex gap-2">
        <Input placeholder="Question" value={newQ} onChange={(e) => setNewQ(e.target.value)} className="flex-1" />
        <Input placeholder="Answer" value={newA} onChange={(e) => setNewA(e.target.value)} className="flex-1" />
        <Button onClick={handleAdd}>Add</Button>
      </div>
      <ul className="space-y-2">
        {sortedQa.length === 0 ? (
          <li className="text-sm text-[var(--text3)] py-4">No questions saved yet.</li>
        ) : (
          sortedQa.map((entry) => {
            const fromInterview = /·|Interview:/i.test(String(entry.category || ''));
            return (
              <li
                key={entry.id}
                className="rounded-lg p-3 border border-[var(--border)]"
                style={{
                  background: fromInterview ? 'rgba(0,212,255,0.06)' : 'var(--panel)',
                  borderColor: fromInterview ? 'rgba(0,212,255,0.35)' : 'var(--border)',
                }}
              >
                {entry.category && (
                  <p className="text-[10px] uppercase tracking-wide text-[var(--cyan)] mb-1">{entry.category}</p>
                )}
                <p className="font-medium text-[var(--text)]">{entry.question}</p>
                <p className="text-sm text-[var(--text2)] mt-1">{entry.answer || '—'}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={QA_STATUS[entry.status]?.bg}>{entry.status}</Badge>
                  <select
                    value={entry.status}
                    onChange={(e) => updateQa.mutate({ id: entry.id, data: { status: e.target.value } })}
                    className="text-xs rounded px-2 py-1 border border-[var(--border)] bg-[rgba(0,0,0,0.25)] text-[var(--text)]"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PREPARED">Prepared</option>
                    <option value="NEEDS_WORK">Needs Work</option>
                  </select>
                  <Button variant="danger" size="sm" onClick={() => deleteQa.mutate(entry.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
